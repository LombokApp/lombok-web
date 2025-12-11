import crypto from 'node:crypto'

import { UnauthorizedException } from '@nestjs/common'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { eventsTable } from 'src/event/entities/event.entity'
import { ServerMetricsService } from 'src/server/services/server-metrics.service'
import type { NewTask } from 'src/task/entities/task.entity'
import { tasksTable } from 'src/task/entities/task.entity'
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

    expect(Number(metrics.totalUsers)).toEqual(0)
    expect(Number(metrics.sessionsCreatedPreviousWeek)).toEqual(0)
    expect(Number(metrics.sessionsCreatedPrevious24Hours)).toEqual(0)
    expect(Number(metrics.usersCreatedPreviousWeek)).toEqual(0)
    expect(Number(metrics.totalFolders)).toEqual(0)
    expect(Number(metrics.foldersCreatedPreviousWeek)).toEqual(0)
    expect(Number(metrics.tasksCreatedPreviousDay)).toEqual(0)
    expect(Number(metrics.tasksCreatedPreviousHour)).toEqual(0)
    expect(Number(metrics.taskErrorsPreviousDay)).toEqual(0)
    expect(Number(metrics.taskErrorsPreviousHour)).toEqual(0)
    expect(Number(metrics.serverEventsEmittedPreviousDay)).toEqual(0)
    expect(Number(metrics.serverEventsEmittedPreviousHour)).toEqual(0)
    expect(Number(metrics.folderEventsEmittedPreviousDay)).toEqual(0)
    expect(Number(metrics.folderEventsEmittedPreviousHour)).toEqual(0)
    expect(Number(metrics.totalIndexedSizeBytes)).toEqual(0)
    expect(
      Number(metrics.totalIndexedSizeBytesAcrossStorageProvisions),
    ).toEqual(0)
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
    const baselineUsers = Number(baselineMetrics.totalUsers)
    const baselineUsersCreatedWeek = Number(
      baselineMetrics.usersCreatedPreviousWeek,
    )
    const baselineTasksDay = Number(baselineMetrics.tasksCreatedPreviousDay)
    const baselineTasksHour = Number(baselineMetrics.tasksCreatedPreviousHour)
    const baselineTaskErrorsDay = Number(baselineMetrics.taskErrorsPreviousDay)
    const baselineTaskErrorsHour = Number(
      baselineMetrics.taskErrorsPreviousHour,
    )
    const baselineServerEventsHour = Number(
      baselineMetrics.serverEventsEmittedPreviousHour,
    )
    const baselineFolderEventsHour = Number(
      baselineMetrics.folderEventsEmittedPreviousHour,
    )

    await createTestUser(testModule!, {
      username: 'metricsuser2',
      password: '123',
    })

    const now = new Date()
    const taskTrigger = {
      kind: 'event',
      data: {
        eventId: crypto.randomUUID(),
        eventIdentifier: 'metrics:event',
        emitterIdentifier: 'metrics',
        eventData: {},
      },
    }

    await testModule!.services.ormService.db.insert(tasksTable).values([
      {
        id: crypto.randomUUID(),
        ownerIdentifier: 'dummyapp',
        taskIdentifier: 'metrics_task_success',
        taskDescription: 'Successful metrics task',
        data: {},
        trigger: taskTrigger,
        createdAt: now,
        updatedAt: now,
        completedAt: now,
        handlerType: 'worker',
        handlerIdentifier: 'metrics:handler',
        success: true,
      },
      {
        id: crypto.randomUUID(),
        ownerIdentifier: 'dummyapp',
        taskIdentifier: 'metrics_task_failure',
        taskDescription: 'Failing metrics task',
        data: {},
        trigger: taskTrigger,
        createdAt: now,
        updatedAt: now,
        completedAt: now,
        handlerType: 'worker',
        handlerIdentifier: 'metrics:handler',
        success: false,
      },
    ] as NewTask[])

    await testModule!.services.ormService.db.insert(eventsTable).values([
      {
        id: crypto.randomUUID(),
        eventIdentifier: 'metrics:server_event',
        emitterIdentifier: 'metrics',
        targetUserId: null,
        targetLocation: null,
        data: {},
        createdAt: now,
      },
      {
        id: crypto.randomUUID(),
        eventIdentifier: 'metrics:folder_event',
        emitterIdentifier: 'metrics',
        targetUserId: null,
        targetLocation: { folderId: crypto.randomUUID() },
        data: {},
        createdAt: now,
      },
    ])

    const updatedMetrics =
      await serverMetricsService.getServerMetrics(adminUser)

    expect(Number(updatedMetrics.totalUsers)).toEqual(baselineUsers + 1)
    expect(Number(updatedMetrics.installedApps.totalCount)).toEqual(2)
    expect(Number(updatedMetrics.usersCreatedPreviousWeek)).toEqual(
      baselineUsersCreatedWeek + 1,
    )
    expect(Number(updatedMetrics.tasksCreatedPreviousDay)).toEqual(
      baselineTasksDay + 2,
    )
    expect(Number(updatedMetrics.tasksCreatedPreviousHour)).toEqual(
      baselineTasksHour + 2,
    )
    expect(Number(updatedMetrics.taskErrorsPreviousDay)).toEqual(
      baselineTaskErrorsDay + 1,
    )
    expect(Number(updatedMetrics.taskErrorsPreviousHour)).toEqual(
      baselineTaskErrorsHour + 1,
    )
    expect(Number(updatedMetrics.serverEventsEmittedPreviousHour)).toEqual(
      baselineServerEventsHour + 1,
    )
    expect(Number(updatedMetrics.folderEventsEmittedPreviousHour)).toEqual(
      baselineFolderEventsHour + 1,
    )
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
