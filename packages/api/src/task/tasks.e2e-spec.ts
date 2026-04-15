import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { io, type Socket } from 'socket.io-client'
import { appFolderSettingsTable } from 'src/app/entities/app-folder-settings.entity'
import { appUserSettingsTable } from 'src/app/entities/app-user-settings.entity'
import { eventsTable } from 'src/event/entities/event.entity'
import { runWithThreadContext } from 'src/shared/thread-context'
import { tasksTable } from 'src/task/entities/task.entity'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
} from 'src/test/test.util'
import { usersTable } from 'src/users/entities/user.entity'

import { getUtcScheduleBucket } from './util/schedule-bucket.util'
import { withTaskIdempotencyKey } from './util/task-idempotency-key.util'

const TEST_MODULE_KEY = 'task_lifecycle'
const startServerOnPort = 7005

const LIFECYCLE_APP_SLUG = 'tasklifecycle'
const PARENT_TASK_ID = 'lifecycle_parent_task'
const PARENT_TASK_SINGLE_ON_COMPLETE_ID =
  'lifecycle_parent_task_single_oncomplete'
const ON_COMPLETE_TASK_ID = 'lifecycle_on_complete'
const CHAIN_ONE_TASK_ID = 'lifecycle_chain_one'
const APP_ACTION_TASK_ID = 'lifecycle_app_action_task'
const SCHEDULE_TASK_ID = 'lifecycle_schedule_task'
const USER_ACTION_TASK_ID = 'lifecycle_user_action_task'
const LIFECYCLE_EVENT_IDENTIFIER = 'dummy_event'
const LIFECYCLE_EVENT_IDENTIFIER_OTHER = 'dummy_event_other'
const SOCKET_DATA_APP_SLUG = 'sockettestappdatatemplate'
const SOCKET_DATA_TASK_IDENTIFIER = 'socket_test_task'

const TEST_EXECUTOR_METADATA = {
  type: 'runtime' as const,
  metadata: { workerIdentifier: 'test-worker' },
}

const TEST_EXECUTOR_METADATA_PARTIAL = {
  type: 'runtime' as const,
  metadata: {},
}

const getTaskByIdentifier = async (
  testModuleRef: TestModule,
  identifier: string,
) => {
  return testModuleRef.services.ormService.db.query.tasksTable.findFirst({
    where: eq(tasksTable.taskIdentifier, identifier),
  })
}

describe('Task lifecycle', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient
  let serverBaseUrl: string
  let socket: Socket | undefined

  const resetTestState = async () => {
    await testModule?.resetAppState()
  }

  const connectAppUserSocket = (userToken: string): Promise<Socket> => {
    const socketUrl = `${serverBaseUrl}/app-user`
    return new Promise((resolve, reject) => {
      const newSocket = io(socketUrl, {
        auth: { token: userToken },
        reconnection: false,
        transports: ['websocket'],
      })

      const timeout = setTimeout(() => {
        newSocket.disconnect()
        reject(new Error('Socket connection timeout'))
      }, 10000)

      newSocket.on('connect', () => {
        clearTimeout(timeout)
        resolve(newSocket)
      })

      newSocket.on('connect_error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })
  }

  const enableAppForUser = async (userId: string, appIdentifier: string) => {
    const now = new Date()
    await testModule!.services.ormService.db
      .insert(appUserSettingsTable)
      .values({
        userId,
        appIdentifier,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })
  }

  const getAppUserToken = async (
    userId: string,
    appIdentifier: string,
  ): Promise<string> => {
    const { accessToken } =
      await testModule!.services.appService.createAppUserAccessTokenAsApp({
        actor: { appIdentifier },
        userId,
      })
    return accessToken
  }

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
      startServerOnPort,
    })
    apiClient = testModule.apiClient
    serverBaseUrl = `http://localhost:${startServerOnPort}`
  })

  afterEach(async () => {
    if (socket) {
      socket.disconnect()
      socket = undefined
    }
    await resetTestState()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  it('creates event-triggered task with dataTemplate functions for socket app', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'socketappuser',
      password: '123456',
    })

    const testFolder = await createTestFolder({
      folderName: 'Socket Data Template',
      testModule,
      accessToken,
      mockFiles: [{ objectKey: 'file.txt', content: 'hello' }],
      apiClient,
    })
    await testModule?.installLocalAppBundles([SOCKET_DATA_APP_SLUG])

    const now = new Date()
    await testModule!.services.ormService.db
      .insert(appFolderSettingsTable)
      .values({
        folderId: testFolder.folder.id,
        appIdentifier: SOCKET_DATA_APP_SLUG,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })

    await testModule!.services.eventService.emitEvent({
      emitterIdentifier: SOCKET_DATA_APP_SLUG,
      eventIdentifier: LIFECYCLE_EVENT_IDENTIFIER,
      data: {
        folderId: testFolder.folder.id,
        objectKey: 'file.txt',
      },
    })

    const task = await getTaskByIdentifier(
      testModule!,
      SOCKET_DATA_TASK_IDENTIFIER,
    )
    expect(task).toBeTruthy()
    expect(task?.data).toEqual({
      folderId: testFolder.folder.id,
      objectKey: 'file.txt',
      fileUrl: expect.any(String) as string,
    })
    expect(typeof task?.data.fileUrl).toBe('string')
    expect(task?.data.fileUrl).toInclude(
      `${testFolder.folder.contentLocation.bucket}/file.txt`,
    )
    expect(task?.data.fileUrl).not.toBe('')
  })

  it('creates onComplete task with dataTemplate functions in task.service path', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'socketappuser2',
      password: '123456',
    })

    const testFolder = await createTestFolder({
      folderName: 'Socket Data Template OnComplete',
      testModule,
      accessToken,
      mockFiles: [{ objectKey: 'file.txt', content: 'hello' }],
      apiClient,
    })
    await testModule?.installLocalAppBundles([SOCKET_DATA_APP_SLUG])

    const now = new Date()
    await testModule!.services.ormService.db
      .insert(appFolderSettingsTable)
      .values({
        folderId: testFolder.folder.id,
        appIdentifier: SOCKET_DATA_APP_SLUG,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })

    const parentTask = await runWithThreadContext(
      crypto.randomUUID(),
      async () => {
        return testModule!.services.taskService.triggerAppActionTask({
          appIdentifier: SOCKET_DATA_APP_SLUG,
          taskIdentifier: SOCKET_DATA_TASK_IDENTIFIER,
          taskData: {
            testKey: 'test-value',
          },
          targetLocation: {
            folderId: testFolder.folder.id,
            objectKey: 'file.txt',
          },
          onComplete: [
            {
              taskIdentifier: SOCKET_DATA_TASK_IDENTIFIER,
              condition: 'task.success',
              dataTemplate: {
                taskKeyValue: '{{task.data.testKey}}',
                fileUrl:
                  "{{createPresignedUrl(task.targetLocation.folderId, task.targetLocation.objectKey, 'GET')}}",
              },
            },
          ],
        })
      },
    )

    await testModule!.services.taskService.registerTaskStarted({
      taskId: parentTask.id,
      executorMetadata: TEST_EXECUTOR_METADATA,
    })

    await testModule!.services.taskService.registerTaskCompleted(
      parentTask.id,
      {
        success: true,
        result: { message: 'parent done' },
        executorMetadata: TEST_EXECUTOR_METADATA,
      },
    )

    const tasks =
      await testModule!.services.ormService.db.query.tasksTable.findMany({
        where: eq(tasksTable.taskIdentifier, SOCKET_DATA_TASK_IDENTIFIER),
      })

    const childTask = tasks.find((t) => t.invocation.kind === 'task_child')
    expect(childTask).toBeTruthy()
    expect(childTask?.data).toEqual({
      taskKeyValue: 'test-value',
      fileUrl: expect.any(String) as string,
    })
    expect(typeof childTask?.data.fileUrl).toBe('string')
    expect(childTask?.data.fileUrl).toStartWith(
      `http://127.0.0.1:9000/${testFolder.folder.contentLocation.bucket}/file.txt?X-Amz-Expires=3600&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Date=`,
    )
  })

  it('enqueues an onComplete task when the parent task completes successfully', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])
    await testModule!.services.eventService.emitEvent({
      emitterIdentifier: LIFECYCLE_APP_SLUG,
      eventIdentifier: LIFECYCLE_EVENT_IDENTIFIER_OTHER,
      data: { payload: 'from-event' },
    })

    const parentTask =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.taskIdentifier, PARENT_TASK_SINGLE_ON_COMPLETE_ID),
      })

    if (!parentTask) {
      throw new Error('Parent task was not created.')
    }

    expect(parentTask.data).toEqual({ payload: 'from-event' })
    expect(parentTask.invocation.kind).toBe('event')

    expect(parentTask.invocation.onComplete).toEqual([
      {
        taskIdentifier: ON_COMPLETE_TASK_ID,
        condition: 'task.success',
        dataTemplate: {
          inheritedPayload: '{{task.data.payload}}',
        },
      },
    ])

    const startedParent =
      await testModule!.services.taskService.registerTaskStarted({
        taskId: parentTask.id,
        executorMetadata: TEST_EXECUTOR_METADATA,
      })

    expect(startedParent.task.startedAt).toBeInstanceOf(Date)
    expect(
      startedParent.task.systemLog.some((entry) => entry.logType === 'started'),
    ).toBe(true)

    await testModule!.services.taskService.registerTaskCompleted(
      parentTask.id,
      {
        success: true,
        result: { message: 'ok' },
        executorMetadata: TEST_EXECUTOR_METADATA,
      },
    )

    const childTask =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.taskIdentifier, ON_COMPLETE_TASK_ID),
      })

    if (!childTask) {
      throw new Error('On-complete child task was not created.')
    }

    if (childTask.invocation.kind === 'task_child') {
      expect(childTask.invocation.invokeContext.parentTask.id).toBe(
        parentTask.id,
      )
    } else {
      throw new Error('Child task was not created with a task_child trigger.')
    }
    expect(childTask.data).toEqual({
      inheritedPayload: 'from-event',
    })
  })

  it('skips onComplete task when the condition evaluates to false', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])
    await testModule!.services.eventService.emitEvent({
      emitterIdentifier: LIFECYCLE_APP_SLUG,
      eventIdentifier: LIFECYCLE_EVENT_IDENTIFIER_OTHER,
      data: { payload: 'from-event' },
    })

    const parentTask =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.taskIdentifier, PARENT_TASK_SINGLE_ON_COMPLETE_ID),
      })

    if (!parentTask) {
      throw new Error('Parent task was not created.')
    }

    await testModule!.services.taskService.registerTaskStarted({
      taskId: parentTask.id,
      executorMetadata: TEST_EXECUTOR_METADATA,
    })

    await testModule!.services.taskService.registerTaskCompleted(
      parentTask.id,
      {
        success: false,
        error: {
          code: 'FAILURE',
          message: 'parent failed',
        },
        executorMetadata: TEST_EXECUTOR_METADATA_PARTIAL,
      },
    )

    const childTask = await getTaskByIdentifier(
      testModule!,
      ON_COMPLETE_TASK_ID,
    )

    expect(childTask).toBeUndefined()
  })

  it('enqueues onComplete tasks (array) and propagates through the chain', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])
    await testModule!.services.eventService.emitEvent({
      emitterIdentifier: LIFECYCLE_APP_SLUG,
      eventIdentifier: LIFECYCLE_EVENT_IDENTIFIER,
      data: { payload: 'from-event' },
    })

    const parentTask =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.taskIdentifier, PARENT_TASK_ID),
      })

    if (!parentTask) {
      throw new Error('Parent task was not created.')
    }

    expect(parentTask.data).toEqual({ payload: 'from-event' })
    expect(parentTask.invocation.kind).toBe('event')
    expect(parentTask.invocation.onComplete).toEqual([
      {
        taskIdentifier: ON_COMPLETE_TASK_ID,
        condition: 'task.success',
        dataTemplate: {
          inheritedPayload: '{{task.data.payload}}',
        },
        onComplete: [
          {
            condition: 'task.success',
            taskIdentifier: CHAIN_ONE_TASK_ID,
            dataTemplate: {
              doubleInheritedPayload: '{{task.data.inheritedPayload}}',
            },
          },
        ],
      },
    ])

    const startedParent =
      await testModule!.services.taskService.registerTaskStarted({
        taskId: parentTask.id,
        executorMetadata: TEST_EXECUTOR_METADATA,
      })

    expect(startedParent.task.startedAt).toBeInstanceOf(Date)
    expect(
      startedParent.task.systemLog.some((entry) => entry.logType === 'started'),
    ).toBe(true)

    await testModule!.services.taskService.registerTaskCompleted(
      parentTask.id,
      {
        success: true,
        result: { message: 'ok' },
        executorMetadata: TEST_EXECUTOR_METADATA,
      },
    )

    const childTask =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.taskIdentifier, ON_COMPLETE_TASK_ID),
      })

    if (!childTask) {
      throw new Error('On-complete child task was not created.')
    }

    if (childTask.invocation.kind === 'task_child') {
      expect(childTask.invocation.invokeContext.parentTask.id).toBe(
        parentTask.id,
      )
    } else {
      throw new Error('Child task was not created with a task_child trigger.')
    }
    expect(childTask.invocation.onComplete).toEqual([
      {
        taskIdentifier: CHAIN_ONE_TASK_ID,
        condition: 'task.success',
        dataTemplate: {
          doubleInheritedPayload: '{{task.data.inheritedPayload}}',
        },
      },
    ])

    expect(childTask.data).toEqual({
      inheritedPayload: 'from-event',
    })

    const startedChildTask =
      await testModule!.services.taskService.registerTaskStarted({
        taskId: childTask.id,
        executorMetadata: TEST_EXECUTOR_METADATA,
      })

    expect(startedChildTask.task.startedAt).toBeInstanceOf(Date)
    expect(
      startedChildTask.task.systemLog.some(
        (entry) => entry.logType === 'started',
      ),
    ).toBe(true)

    const completedChildTask =
      await testModule!.services.taskService.registerTaskCompleted(
        startedChildTask.task.id,
        {
          success: true,
          result: { message: 'ok' },
          executorMetadata: TEST_EXECUTOR_METADATA,
        },
      )
    expect(completedChildTask.completedAt).toBeInstanceOf(Date)
    expect(completedChildTask.success).toBe(true)
    expect(completedChildTask.error).toBeNull()
    expect(
      completedChildTask.systemLog.some((entry) => entry.logType === 'started'),
    ).toBe(true)

    const chainOne =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.taskIdentifier, CHAIN_ONE_TASK_ID),
      })
    if (!chainOne) {
      throw new Error('Chain one task was not created.')
    }
    expect(chainOne.invocation.kind).toBe('task_child')
    if (chainOne.invocation.kind === 'task_child') {
      expect(chainOne.invocation.onComplete).toBeUndefined()
      expect(chainOne.invocation.invokeContext.parentTask.id).toBe(childTask.id)
    }
    expect(chainOne.data).toEqual({ doubleInheritedPayload: 'from-event' })

    const startedChainOne =
      await testModule!.services.taskService.registerTaskStarted({
        taskId: chainOne.id,
        executorMetadata: TEST_EXECUTOR_METADATA,
      })
    expect(startedChainOne.task.startedAt).toBeInstanceOf(Date)
    expect(startedChainOne.task.systemLog.at(0)?.logType).toBe('started')

    await testModule!.services.taskService.registerTaskCompleted(chainOne.id, {
      success: true,
      result: { ok: true },
      executorMetadata: TEST_EXECUTOR_METADATA,
    })

    const parentTaskRecord =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, parentTask.id),
      })

    expect(parentTaskRecord?.success).toBe(true)
    expect(parentTaskRecord?.completedAt).toBeInstanceOf(Date)
    expect(
      parentTaskRecord?.systemLog.some((entry) => entry.logType === 'success'),
    ).toBe(true)

    const events =
      await testModule!.services.ormService.db.query.eventsTable.findMany({
        where: eq(eventsTable.eventIdentifier, LIFECYCLE_EVENT_IDENTIFIER),
      })
    expect(events.length).toBe(1)
  })

  it('creates an app_action task and tracks lifecycle fields', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])
    await runWithThreadContext(crypto.randomUUID(), async () => {
      await testModule!.services.taskService.triggerAppActionTask({
        appIdentifier: LIFECYCLE_APP_SLUG,
        taskIdentifier: APP_ACTION_TASK_ID,
        taskData: { foo: 'bar' },
      })
    })

    const task = await getTaskByIdentifier(testModule!, APP_ACTION_TASK_ID)
    if (!task) {
      throw new Error('App action task was not created.')
    }

    expect(task.invocation.kind).toBe('app_action')
    expect(task.startedAt).toBeNull()
    expect(task.completedAt).toBeNull()
    expect(task.success).toBeNull()
    expect(task.systemLog.length).toBe(0)
    expect(task.updatedAt).toBeInstanceOf(Date)

    const started = await testModule!.services.taskService.registerTaskStarted({
      taskId: task.id,
      executorMetadata: TEST_EXECUTOR_METADATA,
    })

    expect(started.task.startedAt).toBeInstanceOf(Date)
    expect(started.task.completedAt).toBeNull()
    expect(started.task.systemLog.length).toBe(1)
    expect(started.task.systemLog[0]?.logType).toBe('started')
    expect(started.task.systemLog[0]?.payload).toEqual({
      executorMetadata: TEST_EXECUTOR_METADATA,
    })

    const completed =
      await testModule!.services.taskService.registerTaskCompleted(task.id, {
        success: true,
        result: { message: 'done' },
        executorMetadata: TEST_EXECUTOR_METADATA,
      })

    expect(completed.completedAt).toBeInstanceOf(Date)
    expect(completed.success).toBe(true)
    expect(completed.systemLog.length).toBe(2)
    expect(completed.systemLog[1]?.logType).toBe('success')
    expect(completed.systemLog[1]?.payload).toEqual({
      executorMetadata: TEST_EXECUTOR_METADATA,
      result: { message: 'done' },
    })
  })

  it('creates an app_action task with a single onComplete handler', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])

    const parentTask = await runWithThreadContext(
      crypto.randomUUID(),
      async () => {
        return testModule!.services.taskService.triggerAppActionTask({
          appIdentifier: LIFECYCLE_APP_SLUG,
          taskIdentifier: APP_ACTION_TASK_ID,
          taskData: { testData: 'value' },
          onComplete: [
            {
              taskIdentifier: ON_COMPLETE_TASK_ID,
              condition: 'task.success',
              dataTemplate: {
                inheritedData: '{{task.data.testData}}',
              },
            },
          ],
        })
      },
    )

    expect(parentTask.invocation.kind).toBe('app_action')
    expect(parentTask.invocation.onComplete).toEqual([
      {
        taskIdentifier: ON_COMPLETE_TASK_ID,
        condition: 'task.success',
        dataTemplate: {
          inheritedData: '{{task.data.testData}}',
        },
      },
    ])

    await runWithThreadContext(crypto.randomUUID(), async () => {
      await testModule!.services.taskService.registerTaskStarted({
        taskId: parentTask.id,
        executorMetadata: TEST_EXECUTOR_METADATA,
      })

      await testModule!.services.taskService.registerTaskCompleted(
        parentTask.id,
        {
          success: true,
          result: { message: 'parent done' },
          executorMetadata: TEST_EXECUTOR_METADATA,
        },
      )
    })

    const childTask = await getTaskByIdentifier(
      testModule!,
      ON_COMPLETE_TASK_ID,
    )
    if (!childTask) {
      throw new Error('On-complete child task was not created.')
    }

    expect(childTask.invocation.kind).toBe('task_child')
    if (childTask.invocation.kind === 'task_child') {
      expect(childTask.invocation.invokeContext.parentTask.id).toBe(
        parentTask.id,
      )
      expect(childTask.invocation.invokeContext.parentTask.success).toBe(true)
    }
    expect(childTask.data).toEqual({
      inheritedData: 'value',
    })

    const parentTaskRecord =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, parentTask.id),
      })

    expect(parentTaskRecord?.success).toBe(true)
    expect(parentTaskRecord?.completedAt).toBeInstanceOf(Date)
  })

  it('creates an app_action task with an array of onComplete handlers and chains them', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])
    const parentTask = await runWithThreadContext(
      crypto.randomUUID(),
      async () => {
        return testModule!.services.taskService.triggerAppActionTask({
          appIdentifier: LIFECYCLE_APP_SLUG,
          taskIdentifier: APP_ACTION_TASK_ID,
          taskData: { chainData: 'start' },
          onComplete: [
            {
              taskIdentifier: ON_COMPLETE_TASK_ID,
              condition: 'task.success',
              dataTemplate: {
                fromParent: '{{task.data.chainData}}',
              },
              onComplete: [
                {
                  taskIdentifier: CHAIN_ONE_TASK_ID,
                  condition: 'task.success',
                  dataTemplate: {
                    doubleInheritedPayload: '{{task.data.fromParent}}',
                  },
                },
              ],
            },
          ],
        })
      },
    )

    expect(parentTask.invocation.kind).toBe('app_action')
    expect(parentTask.invocation.onComplete).toEqual([
      {
        taskIdentifier: ON_COMPLETE_TASK_ID,
        condition: 'task.success',
        dataTemplate: {
          fromParent: '{{task.data.chainData}}',
        },
        onComplete: [
          {
            taskIdentifier: CHAIN_ONE_TASK_ID,
            condition: 'task.success',
            dataTemplate: {
              doubleInheritedPayload: '{{task.data.fromParent}}',
            },
          },
        ],
      },
    ])

    await testModule!.services.taskService.registerTaskStarted({
      taskId: parentTask.id,
      executorMetadata: TEST_EXECUTOR_METADATA,
    })

    await testModule!.services.taskService.registerTaskCompleted(
      parentTask.id,
      {
        success: true,
        result: { message: 'parent done' },
        executorMetadata: TEST_EXECUTOR_METADATA,
      },
    )

    const firstChild = await getTaskByIdentifier(
      testModule!,
      ON_COMPLETE_TASK_ID,
    )
    if (!firstChild) {
      throw new Error('First on-complete child task was not created.')
    }

    expect(firstChild.invocation.kind).toBe('task_child')
    if (firstChild.invocation.kind === 'task_child') {
      expect(firstChild.invocation.invokeContext.parentTask.id).toBe(
        parentTask.id,
      )
      expect(firstChild.invocation.onComplete).toEqual([
        {
          taskIdentifier: CHAIN_ONE_TASK_ID,
          condition: 'task.success',
          dataTemplate: {
            doubleInheritedPayload: '{{task.data.fromParent}}',
          },
        },
      ])
    }
    expect(firstChild.data).toEqual({
      fromParent: 'start',
    })

    await testModule!.services.taskService.registerTaskStarted({
      taskId: firstChild.id,
      executorMetadata: TEST_EXECUTOR_METADATA,
    })

    await testModule!.services.taskService.registerTaskCompleted(
      firstChild.id,
      {
        success: true,
        result: { message: 'first child done' },
        executorMetadata: TEST_EXECUTOR_METADATA,
      },
    )

    const secondChild = await getTaskByIdentifier(
      testModule!,
      CHAIN_ONE_TASK_ID,
    )
    if (!secondChild) {
      throw new Error('Second on-complete child task was not created.')
    }

    expect(secondChild.invocation.kind).toBe('task_child')
    if (secondChild.invocation.kind === 'task_child') {
      expect(secondChild.invocation.invokeContext.parentTask.id).toBe(
        firstChild.id,
      )
      expect(secondChild.invocation.onComplete).toBeUndefined()
    }
    expect(secondChild.data).toEqual({
      doubleInheritedPayload: 'start',
    })

    const parentTaskRecord =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, parentTask.id),
      })

    expect(parentTaskRecord?.success).toBe(true)
    expect(parentTaskRecord?.completedAt).toBeInstanceOf(Date)
  })

  it('enqueues onComplete task when a negated condition matches a failure', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])
    const parentTask = await runWithThreadContext(
      crypto.randomUUID(),
      async () => {
        return testModule!.services.taskService.triggerAppActionTask({
          appIdentifier: LIFECYCLE_APP_SLUG,
          taskIdentifier: APP_ACTION_TASK_ID,
          taskData: { shouldFail: true },
          onComplete: [
            {
              taskIdentifier: ON_COMPLETE_TASK_ID,
              condition: '!task.success',
            },
          ],
        })
      },
    )

    await runWithThreadContext(crypto.randomUUID(), async () => {
      await testModule!.services.taskService.registerTaskStarted({
        taskId: parentTask.id,
        executorMetadata: TEST_EXECUTOR_METADATA,
      })

      await testModule!.services.taskService.registerTaskCompleted(
        parentTask.id,
        {
          success: false,
          error: {
            code: 'NEGATED_FAILURE',
            message: 'expected failure',
          },
          executorMetadata: TEST_EXECUTOR_METADATA_PARTIAL,
        },
      )
    })

    const childTask = await getTaskByIdentifier(
      testModule!,
      ON_COMPLETE_TASK_ID,
    )
    if (!childTask) {
      throw new Error('On-complete child task was not created.')
    }

    expect(childTask.invocation.kind).toBe('task_child')
    if (childTask.invocation.kind === 'task_child') {
      expect(childTask.invocation.invokeContext.parentTask.success).toBe(false)
    }
  })

  it('creates schedule-triggered tasks and skips duplicates within interval', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])

    await testModule!.services.eventService.processScheduledTaskTriggers()

    const firstTask = await getTaskByIdentifier(testModule!, SCHEDULE_TASK_ID)
    if (!firstTask) {
      throw new Error('Schedule task was not created.')
    }

    if (firstTask.invocation.kind === 'schedule') {
      expect(firstTask.invocation.invokeContext).toEqual({
        name: 'dummy_schedule',
        config: {
          interval: 1,
          unit: 'hours',
        },
        timestampBucket: getUtcScheduleBucket(
          firstTask.invocation.invokeContext.config,
          firstTask.createdAt,
        ).bucketStart.toISOString(),
      })
    } else {
      throw new Error('Schedule task trigger was not schedule.')
    }
    expect(firstTask.startedAt).toBeNull()
    expect(firstTask.completedAt).toBeNull()
    expect(firstTask.success).toBeNull()
    expect(firstTask.systemLog.length).toBe(0)

    await testModule!.services.eventService.processScheduledTaskTriggers()

    const existingTasks =
      await testModule!.services.ormService.db.query.tasksTable.findMany({
        where: eq(tasksTable.taskIdentifier, SCHEDULE_TASK_ID),
      })

    expect(existingTasks.length).toBe(1)
  })

  it('creates a user_action task and tracks lifecycle fields', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])
    await createTestUser(testModule!, {
      username: 'taskuser',
      password: '123456',
    })

    const createdUser =
      await testModule!.services.ormService.db.query.usersTable.findFirst({
        where: eq(usersTable.username, 'taskuser'),
      })
    const userId = createdUser?.id
    if (!userId) {
      throw new Error('User not created.')
    }
    await runWithThreadContext(crypto.randomUUID(), async () => {
      const task =
        await testModule!.services.taskService.triggerAppUserActionTask({
          userId,
          appIdentifier: LIFECYCLE_APP_SLUG,
          taskIdentifier: USER_ACTION_TASK_ID,
          taskData: { from: 'user' },
          targetUserId: userId,
        })

      expect(task.invocation.kind).toBe('user_action')
      if (task.invocation.kind === 'user_action') {
        expect(task.invocation.invokeContext.userId).toBe(userId)
      }
      expect(task.startedAt).toBeNull()
      expect(task.completedAt).toBeNull()
      expect(task.success).toBeNull()
      expect(task.systemLog.length).toBe(0)

      const started =
        await testModule!.services.taskService.registerTaskStarted({
          taskId: task.id,
          executorMetadata: TEST_EXECUTOR_METADATA,
        })
      expect(started.task.systemLog.at(0)?.logType).toBe('started')
      expect(started.task.startedAt).toBeInstanceOf(Date)
      expect(started.task.completedAt).toBeNull()

      const completed =
        await testModule!.services.taskService.registerTaskCompleted(task.id, {
          success: true,
          result: { message: 'user-finished' },
          executorMetadata: TEST_EXECUTOR_METADATA,
        })

      expect(completed.systemLog.at(1)?.logType).toBe('success')
      expect(completed.systemLog.at(1)?.payload).toEqual({
        executorMetadata: TEST_EXECUTOR_METADATA,
        result: { message: 'user-finished' },
      })
      expect(completed.completedAt).toBeInstanceOf(Date)
      expect(completed.success).toBe(true)
    })
  })

  it('handles invalid byte sequences in task data', async () => {
    await runWithThreadContext(crypto.randomUUID(), async () => {
      await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])
      const task = await testModule!.services.taskService.triggerAppActionTask({
        appIdentifier: LIFECYCLE_APP_SLUG,
        taskIdentifier: APP_ACTION_TASK_ID,
        taskData: {
          raw: 'This is invalid: \u0000',
          nested: {
            value: 'Another null byte: \u0000 here',
            array: ['normal', 'with null: \u0000', 'end'],
          },
        },
      })

      const retrievedTask = await getTaskByIdentifier(
        testModule!,
        APP_ACTION_TASK_ID,
      )
      if (!retrievedTask) {
        throw new Error('Task with invalid byte sequences was not created.')
      }

      expect(retrievedTask.id).toBe(task.id)
      expect(retrievedTask.data).toEqual({
        raw: 'This is invalid: \u0000',
        nested: {
          value: 'Another null byte: \u0000 here',
          array: ['normal', 'with null: \u0000', 'end'],
        },
      })

      // Verify that null bytes are preserved in the stored data
      if (typeof retrievedTask.data.raw === 'string') {
        expect(retrievedTask.data.raw).toInclude('\u0000')
      }
      if (
        typeof retrievedTask.data.nested === 'object' &&
        retrievedTask.data.nested !== null &&
        !Array.isArray(retrievedTask.data.nested)
      ) {
        const nested = retrievedTask.data.nested as {
          value?: unknown
          array?: unknown
        }
        if (typeof nested.value === 'string') {
          expect(nested.value).toInclude('\u0000')
        }
        if (
          Array.isArray(nested.array) &&
          typeof nested.array[1] === 'string'
        ) {
          expect(nested.array[1]).toInclude('\u0000')
        }
      }

      // Verify the task can be retrieved from the database
      const taskFromDb =
        await testModule!.services.ormService.db.query.tasksTable.findFirst({
          where: eq(tasksTable.id, task.id),
        })

      expect(taskFromDb).toBeTruthy()
      if (taskFromDb) {
        expect(taskFromDb.data).toEqual({
          raw: 'This is invalid: \u0000',
          nested: {
            value: 'Another null byte: \u0000 here',
            array: ['normal', 'with null: \u0000', 'end'],
          },
        })
      }
    })
  })

  it('should base64 encode payloads in the systemLog and taskLog', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])
    await testModule!.services.ormService.db.insert(tasksTable).values([
      withTaskIdempotencyKey({
        id: crypto.randomUUID(),
        ownerIdentifier: LIFECYCLE_APP_SLUG,
        taskIdentifier: APP_ACTION_TASK_ID,
        invocation: {
          kind: 'app_action',
          invokeContext: {
            requestId: crypto.randomUUID(),
          },
        },
        handlerType: 'app_action',
        handlerIdentifier: 'app_action',
        taskDescription: 'Test task',
        createdAt: new Date(),
        updatedAt: new Date(),
        data: { raw: 'This is invalid (in data): \u0000' },
        systemLog: [
          {
            at: new Date(),
            logType: 'started',
            message: 'Task is started',
            payload: {
              raw: 'This is invalid: \u0000',
              nested: {
                value: 'Another null byte: \u0000 here',
                array: ['normal', 'with null: \u0000', 'end'],
              },
            },
          },
        ],
        taskLog: [
          {
            at: new Date(),
            message: 'Test tasklog',
            logType: 'started',
            payload: {
              raw: 'This is invalid (tasklog): \u0000',
              nested: {
                value: 'Another null byte (tasklog): \u0000 here',
                array: [
                  'normal (tasklog)',
                  'with null: \u0000',
                  'end (tasklog)',
                ],
              },
            },
          },
        ],
      }),
    ])

    const result = await testModule!.services.ormService.client.query<{
      system_log: {
        at: string
        message: string
        logType: string
        payload: string
      }[]
      task_log: {
        at: string
        message: string
        logType: string
        payload: string
      }[]
      data: { base64: string }
    }>(
      `SELECT system_log, task_log, data FROM tasks WHERE task_identifier = '${APP_ACTION_TASK_ID}'`,
    )

    expect(result.rows[0]?.system_log).toEqual([
      {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        at: expect.any(String),
        logType: 'started',
        message: 'Task is started',
        payload:
          'eyJyYXciOiJUaGlzIGlzIGludmFsaWQ6IFx1MDAwMCIsIm5lc3RlZCI6eyJ2YWx1ZSI6IkFub3RoZXIgbnVsbCBieXRlOiBcdTAwMDAgaGVyZSIsImFycmF5IjpbIm5vcm1hbCIsIndpdGggbnVsbDogXHUwMDAwIiwiZW5kIl19fQ==',
      },
    ])

    expect(result.rows[0]?.task_log).toEqual([
      {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        at: expect.any(String),
        message: 'Test tasklog',
        logType: 'started',
        payload:
          'eyJyYXciOiJUaGlzIGlzIGludmFsaWQgKHRhc2tsb2cpOiBcdTAwMDAiLCJuZXN0ZWQiOnsidmFsdWUiOiJBbm90aGVyIG51bGwgYnl0ZSAodGFza2xvZyk6IFx1MDAwMCBoZXJlIiwiYXJyYXkiOlsibm9ybWFsICh0YXNrbG9nKSIsIndpdGggbnVsbDogXHUwMDAwIiwiZW5kICh0YXNrbG9nKSJdfX0=',
      },
    ])

    expect(result.rows[0]?.data).toEqual({
      base64: 'eyJyYXciOiJUaGlzIGlzIGludmFsaWQgKGluIGRhdGEpOiBcdTAwMDAifQ==',
    })
  })

  it('should decode payloads in the systemLog and taskLog from base64', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])
    const appIdentifier = LIFECYCLE_APP_SLUG
    await testModule!.services.ormService.db.insert(tasksTable).values([
      withTaskIdempotencyKey({
        id: crypto.randomUUID(),
        ownerIdentifier: appIdentifier,
        taskIdentifier: APP_ACTION_TASK_ID,
        invocation: {
          kind: 'app_action',
          invokeContext: {
            requestId: crypto.randomUUID(),
          },
        },
        handlerType: 'app_action',
        handlerIdentifier: 'app_action',
        taskDescription: 'Test task',
        createdAt: new Date(),
        updatedAt: new Date(),
        data: { raw: 'This is invalid (in data): \u0000' },
        systemLog: [
          {
            at: new Date(),
            logType: 'started',
            message: 'Task is started',
            payload: {
              raw: 'This is invalid: \u0000',
              nested: {
                value: 'Another null byte: \u0000 here',
                array: ['normal', 'with null: \u0000', 'end'],
              },
            },
          },
        ],
        taskLog: [
          {
            at: new Date(),
            message: 'Test tasklog',
            logType: 'started',
            payload: {
              raw: 'This is invalid (tasklog): \u0000',
              nested: {
                value: 'Another null byte (tasklog): \u0000 here',
                array: [
                  'normal (tasklog)',
                  'with null: \u0000',
                  'end (tasklog)',
                ],
              },
            },
          },
        ],
      }),
    ])

    const retrievedTask = await getTaskByIdentifier(
      testModule!,
      APP_ACTION_TASK_ID,
    )
    if (!retrievedTask) {
      throw new Error('Task with invalid byte sequences was not created.')
    }

    expect(retrievedTask.systemLog).toEqual([
      {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        at: expect.any(Date),
        message: 'Task is started',
        logType: 'started',
        payload: {
          raw: 'This is invalid: \u0000',
          nested: {
            value: 'Another null byte: \u0000 here',
            array: ['normal', 'with null: \u0000', 'end'],
          },
        },
      },
    ])

    expect(retrievedTask.taskLog).toEqual([
      {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        at: expect.any(Date),
        message: 'Test tasklog',
        logType: 'started',
        payload: {
          raw: 'This is invalid (tasklog): \u0000',
          nested: {
            value: 'Another null byte (tasklog): \u0000 here',
            array: ['normal (tasklog)', 'with null: \u0000', 'end (tasklog)'],
          },
        },
      },
    ])

    expect(retrievedTask.data).toEqual({
      raw: 'This is invalid (in data): \u0000',
    })
  })

  it('should allow inserting null bytes in task systemLog and taskLog', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])
    await testModule!.services.ormService.db.insert(tasksTable).values([
      withTaskIdempotencyKey({
        id: crypto.randomUUID(),
        ownerIdentifier: LIFECYCLE_APP_SLUG,
        taskIdentifier: APP_ACTION_TASK_ID,
        invocation: {
          kind: 'app_action',
          invokeContext: {
            requestId: crypto.randomUUID(),
          },
        },
        handlerType: 'app_action',
        handlerIdentifier: 'app_action',
        taskDescription: 'Test task',
        createdAt: new Date(),
        updatedAt: new Date(),
        data: { raw: 'This is invalid: \u0000' },
        systemLog: [
          {
            at: new Date(),
            logType: 'started',
            message: 'Task is started',
            payload: {
              raw: 'This is invalid: \u0000',
              nested: {
                value: 'Another null byte: \u0000 here',
                array: ['normal', 'with null: \u0000', 'end'],
              },
            },
          },
        ],
      }),
    ])

    const retrievedTask = await getTaskByIdentifier(
      testModule!,
      APP_ACTION_TASK_ID,
    )
    if (!retrievedTask) {
      throw new Error('Task with invalid byte sequences was not created.')
    }

    expect(retrievedTask.systemLog).toEqual([
      {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        at: expect.any(Date),
        logType: 'started',
        message: 'Task is started',
        payload: {
          raw: 'This is invalid: \u0000',
          nested: {
            value: 'Another null byte: \u0000 here',
            array: ['normal', 'with null: \u0000', 'end'],
          },
        },
      },
    ])
  })

  // --- Task update → socket emission tests ---

  it('emits user-scoped ASYNC_UPDATE on app-user socket when a task update is registered', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])

    await createTestUser(testModule!, {
      username: 'update_socket_user_1',
      password: '123',
    })

    const user =
      await testModule!.services.ormService.db.query.usersTable.findFirst({
        where: eq(usersTable.username, 'update_socket_user_1'),
      })
    const userId = user!.id

    const appIdentifier = LIFECYCLE_APP_SLUG
    await enableAppForUser(userId, appIdentifier)

    // Create task with correlationKey and targetUserId
    const task = await runWithThreadContext(crypto.randomUUID(), async () => {
      return testModule!.services.taskService.triggerAppActionTask({
        appIdentifier,
        taskIdentifier: APP_ACTION_TASK_ID,
        taskData: { test: 'update-socket' },
        correlationKey: 'ck-docker-update-1',
        targetUserId: userId,
      })
    })

    // Start the task (registerTaskUpdate requires started & not completed)
    await testModule!.services.taskService.registerTaskStarted({
      taskId: task.id,
      executorMetadata: TEST_EXECUTOR_METADATA,
    })

    // Connect to app-user socket with app-user token
    const appUserToken = await getAppUserToken(userId, appIdentifier)
    socket = await connectAppUserSocket(appUserToken)

    // Listen for ASYNC_UPDATE then send the update
    const received = await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Expected ASYNC_UPDATE but got none')),
        5000,
      )
      socket!.once('ASYNC_UPDATE', (data) => {
        clearTimeout(timeout)
        resolve(data)
      })

      // Simulate docker worker sending an update via registerTaskUpdate
      void testModule!.services.taskService.registerTaskUpdate(task.id, {
        progress: {
          percent: 50,
          current: 1,
          total: 2,
          label: 'Processing',
        },
        message: { level: 'info', text: 'Halfway done', audience: 'user' },
      })
    })

    expect(received).toBeDefined()
    expect((received as { correlationKey: string }).correlationKey).toBe(
      'ck-docker-update-1',
    )
    expect(
      (received as { progress: { percent: number } }).progress.percent,
    ).toBe(50)
    expect((received as { message: { text: string } }).message.text).toBe(
      'Halfway done',
    )
    expect((received as { receivedAt: string }).receivedAt).toBeDefined()
  })

  it('emits folder-scoped ASYNC_UPDATE on app-user socket when a task update targets a folder', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])

    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'update_socket_user_2',
      password: '123',
    })

    const user =
      await testModule!.services.ormService.db.query.usersTable.findFirst({
        where: eq(usersTable.username, 'update_socket_user_2'),
      })
    const userId = user!.id

    const appIdentifier = LIFECYCLE_APP_SLUG
    await enableAppForUser(userId, appIdentifier)

    const { folder } = await createTestFolder({
      accessToken,
      folderName: 'Task Update Folder',
      testModule,
      mockFiles: [],
      apiClient,
    })

    // Enable app for folder
    const now = new Date()
    await testModule!.services.ormService.db
      .insert(appFolderSettingsTable)
      .values({
        folderId: folder.id,
        appIdentifier,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })

    // Create task targeting the folder
    const task = await runWithThreadContext(crypto.randomUUID(), async () => {
      return testModule!.services.taskService.triggerAppActionTask({
        appIdentifier,
        taskIdentifier: APP_ACTION_TASK_ID,
        taskData: { test: 'folder-update' },
        correlationKey: 'ck-docker-folder-1',
        targetLocation: { folderId: folder.id },
      })
    })

    await testModule!.services.taskService.registerTaskStarted({
      taskId: task.id,
      executorMetadata: TEST_EXECUTOR_METADATA,
    })

    // Connect to app-user socket and subscribe to the folder
    const appUserToken = await getAppUserToken(userId, appIdentifier)
    socket = await connectAppUserSocket(appUserToken)

    await new Promise<void>((resolve) => {
      socket!.emit('subscribe', { folderId: folder.id, appIdentifier })
      setTimeout(resolve, 500)
    })

    const received = await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Expected ASYNC_UPDATE but got none')),
        5000,
      )
      socket!.once('ASYNC_UPDATE', (data) => {
        clearTimeout(timeout)
        resolve(data)
      })

      void testModule!.services.taskService.registerTaskUpdate(task.id, {
        progress: { percent: 75, label: 'Almost done' },
        message: {
          level: 'info',
          text: 'Processing folder data',
          audience: 'user',
        },
      })
    })

    expect(received).toBeDefined()
    expect((received as { correlationKey: string }).correlationKey).toBe(
      'ck-docker-folder-1',
    )
    expect(
      (received as { progress: { percent: number } }).progress.percent,
    ).toBe(75)
  })

  it('stores task updates in the database and tracks latest progress', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])

    const task = await runWithThreadContext(crypto.randomUUID(), async () => {
      return testModule!.services.taskService.triggerAppActionTask({
        appIdentifier: LIFECYCLE_APP_SLUG,
        taskIdentifier: APP_ACTION_TASK_ID,
        taskData: { test: 'stored-updates' },
        correlationKey: 'ck-stored',
      })
    })

    await testModule!.services.taskService.registerTaskStarted({
      taskId: task.id,
      executorMetadata: TEST_EXECUTOR_METADATA,
    })

    // Send two updates
    await testModule!.services.taskService.registerTaskUpdate(task.id, {
      progress: { percent: 25, current: 1, total: 4 },
      message: { level: 'info', text: 'Step 1', audience: 'user' },
    })

    await testModule!.services.taskService.registerTaskUpdate(task.id, {
      progress: { percent: 75, current: 3, total: 4 },
      message: { level: 'info', text: 'Step 3', audience: 'user' },
    })

    // Verify updates stored in DB
    const updatedTask =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, task.id),
      })

    expect(updatedTask).toBeTruthy()
    expect(updatedTask!.updates).toHaveLength(2)
    expect(updatedTask!.updates[0]?.progress?.percent).toBe(25)
    expect(updatedTask!.updates[0]?.receivedAt).toBeDefined()
    expect(updatedTask!.updates[1]?.progress?.percent).toBe(75)
    expect(updatedTask!.updates[1]?.receivedAt).toBeDefined()

    // Latest progress should reflect the most recent update
    expect(updatedTask!.progress).toEqual({
      percent: 75,
      current: 3,
      total: 4,
    })
  })

  it('does not emit socket update when task has no target scope', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])

    // Create task WITHOUT targetUserId or targetLocation
    const task = await runWithThreadContext(crypto.randomUUID(), async () => {
      return testModule!.services.taskService.triggerAppActionTask({
        appIdentifier: LIFECYCLE_APP_SLUG,
        taskIdentifier: APP_ACTION_TASK_ID,
        taskData: { test: 'no-scope' },
        correlationKey: 'ck-no-scope',
      })
    })

    await testModule!.services.taskService.registerTaskStarted({
      taskId: task.id,
      executorMetadata: TEST_EXECUTOR_METADATA,
    })

    // Create a user and connect to the socket
    await createTestUser(testModule!, {
      username: 'update_socket_user_3',
      password: '123',
    })

    const user =
      await testModule!.services.ormService.db.query.usersTable.findFirst({
        where: eq(usersTable.username, 'update_socket_user_3'),
      })

    const appIdentifier = LIFECYCLE_APP_SLUG
    await enableAppForUser(user!.id, appIdentifier)

    const appUserToken = await getAppUserToken(user!.id, appIdentifier)
    socket = await connectAppUserSocket(appUserToken)

    // Send update — should NOT emit because task has no target scope
    const received = await new Promise<boolean>((resolve) => {
      socket!.once('ASYNC_UPDATE', () => resolve(true))
      void testModule!.services.taskService.registerTaskUpdate(task.id, {
        progress: { percent: 50 },
      })
      setTimeout(() => resolve(false), 1500)
    })

    expect(received).toBe(false)

    // But the update should still be stored in the DB
    const updatedTask =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, task.id),
      })
    expect(updatedTask!.updates).toHaveLength(1)
  })

  it('rejects registerTaskUpdate for a task that is not started', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])

    const task = await runWithThreadContext(crypto.randomUUID(), async () => {
      return testModule!.services.taskService.triggerAppActionTask({
        appIdentifier: LIFECYCLE_APP_SLUG,
        taskIdentifier: APP_ACTION_TASK_ID,
        taskData: { test: 'not-started' },
      })
    })

    // Do NOT start the task — registerTaskUpdate should return null
    const result = await testModule!.services.taskService.registerTaskUpdate(
      task.id,
      {
        progress: { percent: 10 },
      },
    )

    expect(result).toBeNull()
  })

  it('rejects registerTaskUpdate for a completed task', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])

    const task = await runWithThreadContext(crypto.randomUUID(), async () => {
      return testModule!.services.taskService.triggerAppActionTask({
        appIdentifier: LIFECYCLE_APP_SLUG,
        taskIdentifier: APP_ACTION_TASK_ID,
        taskData: { test: 'already-completed' },
      })
    })

    await testModule!.services.taskService.registerTaskStarted({
      taskId: task.id,
      executorMetadata: TEST_EXECUTOR_METADATA,
    })

    await testModule!.services.taskService.registerTaskCompleted(task.id, {
      success: true,
      result: { done: true },
      executorMetadata: TEST_EXECUTOR_METADATA,
    })

    // Task is completed — registerTaskUpdate should return null
    const result = await testModule!.services.taskService.registerTaskUpdate(
      task.id,
      {
        progress: { percent: 99 },
      },
    )

    expect(result).toBeNull()
  })

  // --- Task lifecycle (started/completed) → socket emission tests ---

  it('emits task_started ASYNC_UPDATE when a user-scoped task is started', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])

    await createTestUser(testModule!, {
      username: 'started_socket_user',
      password: '123',
    })

    const user =
      await testModule!.services.ormService.db.query.usersTable.findFirst({
        where: eq(usersTable.username, 'started_socket_user'),
      })
    const userId = user!.id

    const appIdentifier = LIFECYCLE_APP_SLUG
    await enableAppForUser(userId, appIdentifier)

    // Create task with targetUserId
    const task = await runWithThreadContext(crypto.randomUUID(), async () => {
      return testModule!.services.taskService.triggerAppActionTask({
        appIdentifier,
        taskIdentifier: APP_ACTION_TASK_ID,
        taskData: { test: 'started-socket' },
        correlationKey: 'ck-started-1',
        targetUserId: userId,
      })
    })

    // Connect socket before starting the task
    const appUserToken = await getAppUserToken(userId, appIdentifier)
    socket = await connectAppUserSocket(appUserToken)

    const received = await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(
        () =>
          reject(new Error('Expected task_started ASYNC_UPDATE but got none')),
        5000,
      )
      socket!.once('ASYNC_UPDATE', (data) => {
        clearTimeout(timeout)
        resolve(data)
      })
    })

    expect(received).toBeDefined()
    expect((received as { correlationKey: string }).correlationKey).toBe(
      'ck-started-1',
    )
    expect((received as { code: string }).code).toBe('task_started')
    expect((received as { message: { text: string } }).message.text).toBe(
      `Task started: ${APP_ACTION_TASK_ID}`,
    )
    expect(
      (received as { message: { audience: string } }).message.audience,
    ).toBe('system')
    expect((received as { data: { taskId: string } }).data.taskId).toBe(task.id)
    expect((received as { receivedAt: string }).receivedAt).toBeDefined()
  })

  it('emits task_completed ASYNC_UPDATE when a user-scoped task completes successfully', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])

    await createTestUser(testModule!, {
      username: 'completed_socket_user',
      password: '123',
    })

    const user =
      await testModule!.services.ormService.db.query.usersTable.findFirst({
        where: eq(usersTable.username, 'completed_socket_user'),
      })
    const userId = user!.id

    const appIdentifier = LIFECYCLE_APP_SLUG
    await enableAppForUser(userId, appIdentifier)

    const task = await runWithThreadContext(crypto.randomUUID(), async () => {
      return testModule!.services.taskService.triggerAppActionTask({
        appIdentifier,
        taskIdentifier: APP_ACTION_TASK_ID,
        taskData: { test: 'completed-socket' },
        correlationKey: 'ck-completed-1',
        targetUserId: userId,
      })
    })

    await testModule!.services.taskService.registerTaskStarted({
      taskId: task.id,
      executorMetadata: TEST_EXECUTOR_METADATA,
    })

    // Connect socket after starting (skip the task_started event)
    const appUserToken = await getAppUserToken(userId, appIdentifier)
    socket = await connectAppUserSocket(appUserToken)

    const received = await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(
        () =>
          reject(
            new Error('Expected task_completed ASYNC_UPDATE but got none'),
          ),
        5000,
      )
      socket!.once('ASYNC_UPDATE', (data) => {
        clearTimeout(timeout)
        resolve(data)
      })

      void testModule!.services.taskService.registerTaskCompleted(task.id, {
        success: true,
        result: { output: 'done' },
        executorMetadata: TEST_EXECUTOR_METADATA,
      })
    })

    expect(received).toBeDefined()
    expect((received as { correlationKey: string }).correlationKey).toBe(
      'ck-completed-1',
    )
    expect((received as { code: string }).code).toBe('task_completed')
    expect((received as { message: { level: string } }).message.level).toBe(
      'info',
    )
    expect((received as { message: { text: string } }).message.text).toBe(
      `Task completed: ${APP_ACTION_TASK_ID}`,
    )
    expect(
      (received as { progress: { percent: number } }).progress.percent,
    ).toBe(100)
    expect((received as { data: { taskId: string } }).data.taskId).toBe(task.id)
  })

  it('emits task_failed ASYNC_UPDATE when a user-scoped task fails', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])

    await createTestUser(testModule!, {
      username: 'failed_socket_user',
      password: '123',
    })

    const user =
      await testModule!.services.ormService.db.query.usersTable.findFirst({
        where: eq(usersTable.username, 'failed_socket_user'),
      })
    const userId = user!.id

    const appIdentifier = LIFECYCLE_APP_SLUG
    await enableAppForUser(userId, appIdentifier)

    const task = await runWithThreadContext(crypto.randomUUID(), async () => {
      return testModule!.services.taskService.triggerAppActionTask({
        appIdentifier,
        taskIdentifier: APP_ACTION_TASK_ID,
        taskData: { test: 'failed-socket' },
        correlationKey: 'ck-failed-1',
        targetUserId: userId,
      })
    })

    await testModule!.services.taskService.registerTaskStarted({
      taskId: task.id,
      executorMetadata: TEST_EXECUTOR_METADATA,
    })

    const appUserToken = await getAppUserToken(userId, appIdentifier)
    socket = await connectAppUserSocket(appUserToken)

    const received = await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(
        () =>
          reject(new Error('Expected task_failed ASYNC_UPDATE but got none')),
        5000,
      )
      socket!.once('ASYNC_UPDATE', (data) => {
        clearTimeout(timeout)
        resolve(data)
      })

      void testModule!.services.taskService.registerTaskCompleted(task.id, {
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Something went wrong',
        },
        executorMetadata: TEST_EXECUTOR_METADATA_PARTIAL,
      })
    })

    expect(received).toBeDefined()
    expect((received as { correlationKey: string }).correlationKey).toBe(
      'ck-failed-1',
    )
    expect((received as { code: string }).code).toBe('task_failed')
    expect((received as { message: { level: string } }).message.level).toBe(
      'error',
    )
    expect((received as { message: { text: string } }).message.text).toBe(
      `Task failed: ${APP_ACTION_TASK_ID}`,
    )
    expect((received as { progress: undefined }).progress).toBeUndefined()
    expect((received as { data: { taskId: string } }).data.taskId).toBe(task.id)
  })

  it('does not emit task_started when task has no target scope', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])

    await createTestUser(testModule!, {
      username: 'no_scope_started_user',
      password: '123',
    })

    const user =
      await testModule!.services.ormService.db.query.usersTable.findFirst({
        where: eq(usersTable.username, 'no_scope_started_user'),
      })

    const appIdentifier = LIFECYCLE_APP_SLUG
    await enableAppForUser(user!.id, appIdentifier)

    // Create task WITHOUT targetUserId or targetLocation
    await runWithThreadContext(crypto.randomUUID(), async () => {
      return testModule!.services.taskService.triggerAppActionTask({
        appIdentifier,
        taskIdentifier: APP_ACTION_TASK_ID,
        taskData: { test: 'no-scope-started' },
      })
    })

    const appUserToken = await getAppUserToken(user!.id, appIdentifier)
    socket = await connectAppUserSocket(appUserToken)

    const received = await new Promise<boolean>((resolve) => {
      socket!.once('ASYNC_UPDATE', () => resolve(true))
      setTimeout(() => resolve(false), 1500)
    })

    expect(received).toBe(false)
  })

  it('does not emit task_completed when task has no target scope', async () => {
    await testModule?.installLocalAppBundles([LIFECYCLE_APP_SLUG])

    await createTestUser(testModule!, {
      username: 'no_scope_completed_user',
      password: '123',
    })

    const user =
      await testModule!.services.ormService.db.query.usersTable.findFirst({
        where: eq(usersTable.username, 'no_scope_completed_user'),
      })

    const appIdentifier = LIFECYCLE_APP_SLUG
    await enableAppForUser(user!.id, appIdentifier)

    // Create task WITHOUT targetUserId or targetLocation
    const task = await runWithThreadContext(crypto.randomUUID(), async () => {
      return testModule!.services.taskService.triggerAppActionTask({
        appIdentifier,
        taskIdentifier: APP_ACTION_TASK_ID,
        taskData: { test: 'no-scope-completed' },
      })
    })

    await testModule!.services.taskService.registerTaskStarted({
      taskId: task.id,
      executorMetadata: TEST_EXECUTOR_METADATA,
    })

    const appUserToken = await getAppUserToken(user!.id, appIdentifier)
    socket = await connectAppUserSocket(appUserToken)

    const received = await new Promise<boolean>((resolve) => {
      socket!.once('ASYNC_UPDATE', () => resolve(true))
      void testModule!.services.taskService.registerTaskCompleted(task.id, {
        success: true,
        result: { done: true },
        executorMetadata: TEST_EXECUTOR_METADATA,
      })
      setTimeout(() => resolve(false), 1500)
    })

    expect(received).toBe(false)
  })
})
