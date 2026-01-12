import crypto from 'node:crypto'

import { UnauthorizedException } from '@nestjs/common'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { count, eq } from 'drizzle-orm'
import { appsTable } from 'src/app/entities/app.entity'
import { eventsTable } from 'src/event/entities/event.entity'
import { ServerMetricsService } from 'src/server/services/server-metrics.service'
import type { NewTask } from 'src/task/entities/task.entity'
import { tasksTable } from 'src/task/entities/task.entity'
import { withTaskIdempotencyKey } from 'src/task/util/task-idempotency-key.util'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'
import type { User } from 'src/users/entities/user.entity'
import { usersTable } from 'src/users/entities/user.entity'

const TEST_MODULE_KEY = 'server_metrics'

describe('Server Metrics', () => {
  let testModule: TestModule | undefined
  let serverMetricsService: ServerMetricsService
  let apiClient: TestApiClient

  const findUserByUsername = async (username: string) => {
    return testModule?.services.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.username, username),
    })
  }

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
    })
    serverMetricsService = await testModule.app.resolve(ServerMetricsService)
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetAppState()
  })

  it('should reject non-admin users', async () => {
    await createTestUser(testModule!, {
      username: 'metricsuser',
      password: '123',
    })
    const actor = await findUserByUsername('metricsuser')
    expect(actor).toBeDefined()

    expect(
      serverMetricsService.getServerMetrics(actor as User),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('should return zeroed metrics for an empty database', async () => {
    const adminActor = { isAdmin: true } as User

    const metrics = await serverMetricsService.getServerMetrics(adminActor)

    expect(metrics.totalUsers).toEqual(BigInt(0))
    expect(metrics.sessionsCreatedPreviousWeek).toEqual(BigInt(0))
    expect(metrics.sessionsCreatedPrevious24Hours).toEqual(BigInt(0))
    expect(metrics.usersCreatedPreviousWeek).toEqual(BigInt(0))
    expect(metrics.totalFolders).toEqual(BigInt(0))
    expect(metrics.foldersCreatedPreviousWeek).toEqual(BigInt(0))
    expect(metrics.tasksCreatedPreviousDay).toEqual(BigInt(0))
    expect(metrics.tasksCreatedPreviousHour).toEqual(BigInt(0))
    expect(metrics.taskErrorsPreviousDay).toEqual(BigInt(0))
    expect(metrics.taskErrorsPreviousHour).toEqual(BigInt(0))
    expect(metrics.serverEventsEmittedPreviousDay).toEqual(BigInt(0))
    expect(metrics.serverEventsEmittedPreviousHour).toEqual(BigInt(0))
    expect(metrics.folderEventsEmittedPreviousDay).toEqual(BigInt(0))
    expect(metrics.folderEventsEmittedPreviousHour).toEqual(BigInt(0))
    expect(metrics.totalIndexedSizeBytes).toEqual(BigInt(0))
    expect(metrics.totalIndexedSizeBytesAcrossStorageProvisions).toEqual(
      BigInt(0),
    )
    expect(metrics.provisionedStorage.totalCount).toEqual(BigInt(0))
    expect(metrics.totalStorageProvisions).toEqual(BigInt(0))
  })

  it('should aggregate recent metrics data', async () => {
    await createTestUser(testModule!, {
      username: 'metricsadmin',
      password: '123',
      admin: true,
    })
    const adminUser = (await findUserByUsername('metricsadmin')) as User

    const baselineMetrics =
      await serverMetricsService.getServerMetrics(adminUser)
    const baselineUsers = baselineMetrics.totalUsers
    const baselineUsersCreatedWeek = baselineMetrics.usersCreatedPreviousWeek
    const baselineTasksDay = baselineMetrics.tasksCreatedPreviousDay
    const baselineTasksHour = baselineMetrics.tasksCreatedPreviousHour
    const baselineTaskErrorsDay = baselineMetrics.taskErrorsPreviousDay
    const baselineTaskErrorsHour = baselineMetrics.taskErrorsPreviousHour
    const baselineServerEventsHour =
      baselineMetrics.serverEventsEmittedPreviousHour
    const baselineFolderEventsHour =
      baselineMetrics.folderEventsEmittedPreviousHour

    await createTestUser(testModule!, {
      username: 'metricsuser2',
      password: '123',
    })

    const now = new Date()
    const taskTrigger = {
      kind: 'event',
      invokeContext: {
        eventIdentifier: 'metricsevent',
        eventTriggerConfigIndex: 0,
        eventId: crypto.randomUUID(),
        emitterIdentifier: 'metrics',
        eventData: {},
      },
    } as const

    await testModule!.services.ormService.db.insert(tasksTable).values([
      withTaskIdempotencyKey({
        id: crypto.randomUUID(),
        ownerIdentifier: 'dummyapp',
        taskIdentifier: 'metrics_task_success',
        taskDescription: 'Successful metrics task',
        data: {},
        invocation: taskTrigger,
        createdAt: now,
        updatedAt: now,
        completedAt: now,
        handlerType: 'runtime',
        handlerIdentifier: 'metrics:handler',
        success: true,
      }),
      withTaskIdempotencyKey({
        id: crypto.randomUUID(),
        ownerIdentifier: 'dummyapp',
        taskIdentifier: 'metrics_task_failure',
        taskDescription: 'Failing metrics task',
        data: {},
        invocation: taskTrigger,
        createdAt: now,
        updatedAt: now,
        completedAt: now,
        handlerType: 'runtime',
        handlerIdentifier: 'metrics:handler',
        success: false,
      }),
    ] as NewTask[])

    await testModule!.services.ormService.db.insert(eventsTable).values([
      {
        id: crypto.randomUUID(),
        eventIdentifier: 'metrics:server_event',
        emitterIdentifier: 'metrics',
        targetUserId: null,
        targetLocationFolderId: null,
        targetLocationObjectKey: null,
        data: {},
        createdAt: now,
      },
      {
        id: crypto.randomUUID(),
        eventIdentifier: 'metrics:folder_event',
        emitterIdentifier: 'metrics',
        targetUserId: null,
        targetLocationFolderId: crypto.randomUUID(),
        targetLocationObjectKey: null,
        data: {},
        createdAt: now,
      },
    ])

    const updatedMetrics =
      await serverMetricsService.getServerMetrics(adminUser)

    const installedAppsCount = (
      await testModule!.services.ormService.db
        .select({ count: count() })
        .from(appsTable)
    )[0]!

    expect(updatedMetrics.totalUsers).toEqual(baselineUsers + BigInt(1))
    expect(updatedMetrics.installedApps.totalCount).toEqual(
      BigInt(installedAppsCount.count),
    )
    expect(updatedMetrics.usersCreatedPreviousWeek).toEqual(
      baselineUsersCreatedWeek + BigInt(1),
    )
    expect(updatedMetrics.tasksCreatedPreviousDay).toEqual(
      baselineTasksDay + BigInt(2),
    )
    expect(updatedMetrics.tasksCreatedPreviousHour).toEqual(
      baselineTasksHour + BigInt(2),
    )
    expect(updatedMetrics.taskErrorsPreviousDay).toEqual(
      baselineTaskErrorsDay + BigInt(1),
    )
    expect(updatedMetrics.taskErrorsPreviousHour).toEqual(
      baselineTaskErrorsHour + BigInt(1),
    )
    expect(updatedMetrics.serverEventsEmittedPreviousHour).toEqual(
      baselineServerEventsHour + BigInt(1),
    )
    expect(updatedMetrics.folderEventsEmittedPreviousHour).toEqual(
      baselineFolderEventsHour + BigInt(1),
    )
  })

  it('should return metrics from the controller endpoint', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'controlleradmin',
      password: '123',
      admin: true,
    })

    const response = await apiClient(accessToken).GET('/api/v1/server/metrics')

    expect(response.response.status).toEqual(200)
    expect(response.data).toBeDefined()

    if (!response.data) {
      throw new Error('No response data received')
    }

    // Verify response structure matches ServerMetricsResponse
    expect(response.data.totalUsers).toBeDefined()
    expect(response.data.totalFolders).toBeDefined()
    expect(response.data.usersCreatedPreviousWeek).toBeDefined()
    expect(response.data.foldersCreatedPreviousWeek).toBeDefined()
    expect(response.data.totalIndexedSizeBytes).toBeDefined()
    expect(response.data.sessionsCreatedPreviousWeek).toBeDefined()
    expect(response.data.sessionsCreatedPrevious24Hours).toBeDefined()
    expect(response.data.provisionedStorage).toBeDefined()
    expect(response.data.provisionedStorage.totalCount).toBeDefined()
    expect(response.data.provisionedStorage.summary).toBeDefined()
    expect(
      response.data.totalIndexedSizeBytesAcrossStorageProvisions,
    ).toBeDefined()
    expect(response.data.installedApps).toBeDefined()
    expect(response.data.installedApps.totalCount).toBeDefined()
    expect(response.data.installedApps.summary).toBeDefined()
    expect(response.data.tasksCreatedPreviousDay).toBeDefined()
    expect(response.data.tasksCreatedPreviousHour).toBeDefined()
    expect(response.data.taskErrorsPreviousDay).toBeDefined()
    expect(response.data.taskErrorsPreviousHour).toBeDefined()
    expect(response.data.serverEventsEmittedPreviousDay).toBeDefined()
    expect(response.data.serverEventsEmittedPreviousHour).toBeDefined()
    expect(response.data.folderEventsEmittedPreviousDay).toBeDefined()
    expect(response.data.folderEventsEmittedPreviousHour).toBeDefined()

    // Verify all values are strings (BigInt converted to string for JSON serialization)
    expect(typeof response.data.totalUsers).toBe('string')
    expect(typeof response.data.totalFolders).toBe('string')
    expect(typeof response.data.usersCreatedPreviousWeek).toBe('string')
    expect(typeof response.data.foldersCreatedPreviousWeek).toBe('string')
    expect(typeof response.data.totalIndexedSizeBytes).toBe('string')
    expect(typeof response.data.sessionsCreatedPreviousWeek).toBe('string')
    expect(typeof response.data.sessionsCreatedPrevious24Hours).toBe('string')
    expect(typeof response.data.provisionedStorage.totalCount).toBe('string')
    expect(
      typeof response.data.totalIndexedSizeBytesAcrossStorageProvisions,
    ).toBe('string')
    expect(typeof response.data.installedApps.totalCount).toBe('string')
    expect(typeof response.data.tasksCreatedPreviousDay).toBe('string')
    expect(typeof response.data.tasksCreatedPreviousHour).toBe('string')
    expect(typeof response.data.taskErrorsPreviousDay).toBe('string')
    expect(typeof response.data.taskErrorsPreviousHour).toBe('string')
    expect(typeof response.data.serverEventsEmittedPreviousDay).toBe('string')
    expect(typeof response.data.serverEventsEmittedPreviousHour).toBe('string')
    expect(typeof response.data.folderEventsEmittedPreviousDay).toBe('string')
    expect(typeof response.data.folderEventsEmittedPreviousHour).toBe('string')

    // Verify summaries are strings
    expect(typeof response.data.provisionedStorage.summary).toBe('string')
    expect(typeof response.data.installedApps.summary).toBe('string')
  })

  it('should reject non-admin users from the controller endpoint', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'controllernonadmin',
      password: '123',
      admin: false,
    })

    const response = await apiClient(accessToken).GET('/api/v1/server/metrics')

    expect(response.response.status).toEqual(401)
    expect(response.error).toBeDefined()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
