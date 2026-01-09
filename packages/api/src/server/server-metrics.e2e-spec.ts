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
import type { TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'
import type { User } from 'src/users/entities/user.entity'
import { usersTable } from 'src/users/entities/user.entity'

const TEST_MODULE_KEY = 'server_metrics'

describe('Server Metrics', () => {
  let testModule: TestModule | undefined
  let serverMetricsService: ServerMetricsService

  const findUserByUsername = async (username: string) => {
    return testModule?.services.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.username, username),
    })
  }

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
    serverMetricsService = await testModule.app.resolve(ServerMetricsService)
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

    expect(metrics.totalUsers).toEqual(0)
    expect(metrics.sessionsCreatedPreviousWeek).toEqual(0)
    expect(metrics.sessionsCreatedPrevious24Hours).toEqual(0)
    expect(metrics.usersCreatedPreviousWeek).toEqual(0)
    expect(metrics.totalFolders).toEqual(0)
    expect(metrics.foldersCreatedPreviousWeek).toEqual(0)
    expect(metrics.tasksCreatedPreviousDay).toEqual(0)
    expect(metrics.tasksCreatedPreviousHour).toEqual(0)
    expect(metrics.taskErrorsPreviousDay).toEqual(0)
    expect(metrics.taskErrorsPreviousHour).toEqual(0)
    expect(metrics.serverEventsEmittedPreviousDay).toEqual(0)
    expect(metrics.serverEventsEmittedPreviousHour).toEqual(0)
    expect(metrics.folderEventsEmittedPreviousDay).toEqual(0)
    expect(metrics.folderEventsEmittedPreviousHour).toEqual(0)
    expect(metrics.totalIndexedSizeBytes).toEqual(0)
    expect(metrics.totalIndexedSizeBytesAcrossStorageProvisions).toEqual(0)
    expect(metrics.provisionedStorage.totalCount).toEqual(0)
    expect(metrics.totalStorageProvisions).toEqual(0)
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
        trigger: taskTrigger,
        storageAccessPolicy: [],
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
        trigger: taskTrigger,
        storageAccessPolicy: [],
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

    expect(updatedMetrics.totalUsers).toEqual(baselineUsers + 1)
    expect(updatedMetrics.installedApps.totalCount).toEqual(
      installedAppsCount.count,
    )
    expect(updatedMetrics.usersCreatedPreviousWeek).toEqual(
      baselineUsersCreatedWeek + 1,
    )
    expect(updatedMetrics.tasksCreatedPreviousDay).toEqual(baselineTasksDay + 2)
    expect(updatedMetrics.tasksCreatedPreviousHour).toEqual(
      baselineTasksHour + 2,
    )
    expect(updatedMetrics.taskErrorsPreviousDay).toEqual(
      baselineTaskErrorsDay + 1,
    )
    expect(updatedMetrics.taskErrorsPreviousHour).toEqual(
      baselineTaskErrorsHour + 1,
    )
    expect(updatedMetrics.serverEventsEmittedPreviousHour).toEqual(
      baselineServerEventsHour + 1,
    )
    expect(updatedMetrics.folderEventsEmittedPreviousHour).toEqual(
      baselineFolderEventsHour + 1,
    )
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
