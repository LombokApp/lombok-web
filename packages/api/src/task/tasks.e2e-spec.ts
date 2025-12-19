import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { appFolderSettingsTable } from 'src/app/entities/app-folder-settings.entity'
import { eventsTable } from 'src/event/entities/event.entity'
import { tasksTable } from 'src/task/entities/task.entity'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
} from 'src/test/test.util'
import { usersTable } from 'src/users/entities/user.entity'

const TEST_MODULE_KEY = 'task_lifecycle'

const LIFECYCLE_APP_ID = 'tasklifecycle'
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
const SOCKET_DATA_APP_ID = 'sockettestappdatatemplate'
const SOCKET_DATA_TASK_IDENTIFIER = 'socket_test_task'

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

  const resetTestState = async () => {
    await testModule?.resetAppState()
  }

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
    })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
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

    const now = new Date()
    await testModule!.services.ormService.db
      .insert(appFolderSettingsTable)
      .values({
        folderId: testFolder.folder.id,
        appIdentifier: SOCKET_DATA_APP_ID,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })

    await testModule!.services.eventService.emitEvent({
      emitterIdentifier: SOCKET_DATA_APP_ID,
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

    const now = new Date()
    await testModule!.services.ormService.db.insert(appFolderSettingsTable).values({
      folderId: testFolder.folder.id,
      appIdentifier: SOCKET_DATA_APP_ID,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    })

    const parentTask =
      await testModule!.services.taskService.triggerAppActionTask({
        appIdentifier: SOCKET_DATA_APP_ID,
        taskIdentifier: SOCKET_DATA_TASK_IDENTIFIER,
        taskData: {
          folderId: testFolder.folder.id,
          objectKey: 'file.txt',
        },
        onComplete: [
          {
            taskIdentifier: SOCKET_DATA_TASK_IDENTIFIER,
            condition: 'task.success',
            dataTemplate: {
              folderId: '{{task.data.folderId}}',
              objectKey: '{{task.data.objectKey}}',
              fileUrl:
                "{{createPresignedUrl(task.data.folderId, task.data.objectKey, 'GET')}}",
            },
          },
        ],
      })

    await testModule!.services.taskService.registerTaskStarted({
      taskId: parentTask.id,
      startContext: { __executor: { kind: 'test' } },
    })

    await testModule!.services.taskService.registerTaskCompleted(
      parentTask.id,
      {
        success: true,
        result: { message: 'parent done' },
      },
    )

    const tasks =
      await testModule!.services.ormService.db.query.tasksTable.findMany({
        where: eq(tasksTable.taskIdentifier, SOCKET_DATA_TASK_IDENTIFIER),
      })

    const childTask = tasks.find((t) => t.trigger.kind === 'task_child')
    expect(childTask).toBeTruthy()
    expect(childTask?.data).toMatchObject({
      folderId: testFolder.folder.id,
      objectKey: 'file.txt',
    })
    expect(typeof childTask?.data.fileUrl).toBe('string')
    expect(childTask?.data.fileUrl).not.toBe('')
  })

  it('enqueues an onComplete task when the parent task completes successfully', async () => {
    await testModule!.services.eventService.emitEvent({
      emitterIdentifier: LIFECYCLE_APP_ID,
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
    expect(parentTask.trigger.kind).toBe('event')

    expect(parentTask.trigger.onComplete).toEqual([
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
        startContext: { __executor: { kind: 'test' } },
      })

    expect(startedParent.task.startedAt).toBeInstanceOf(Date)
    expect(
      startedParent.task.systemLog.some(
        (entry) => entry.payload.logType === 'started',
      ),
    ).toBe(true)

    await testModule!.services.taskService.registerTaskCompleted(
      parentTask.id,
      {
        success: true,
        result: { message: 'ok' },
      },
    )

    const childTask =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.taskIdentifier, ON_COMPLETE_TASK_ID),
      })

    if (!childTask) {
      throw new Error('On-complete child task was not created.')
    }

    if (childTask.trigger.kind === 'task_child') {
      expect(childTask.trigger.invokeContext.parentTask.id).toBe(parentTask.id)
    } else {
      throw new Error('Child task was not created with a task_child trigger.')
    }
    expect(childTask.data).toEqual({
      inheritedPayload: 'from-event',
    })
  })

  it('skips onComplete task when the condition evaluates to false', async () => {
    await testModule!.services.eventService.emitEvent({
      emitterIdentifier: LIFECYCLE_APP_ID,
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
      startContext: { __executor: { kind: 'test' } },
    })

    await testModule!.services.taskService.registerTaskCompleted(
      parentTask.id,
      {
        success: false,
        error: {
          code: 'FAILURE',
          message: 'parent failed',
        },
      },
    )

    const childTask = await getTaskByIdentifier(
      testModule!,
      ON_COMPLETE_TASK_ID,
    )

    expect(childTask).toBeUndefined()
  })

  it('enqueues onComplete tasks (array) and propagates through the chain', async () => {
    await testModule!.services.eventService.emitEvent({
      emitterIdentifier: LIFECYCLE_APP_ID,
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
    expect(parentTask.trigger.kind).toBe('event')
    expect(parentTask.trigger.onComplete).toEqual([
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
        startContext: { __executor: { kind: 'test' } },
      })

    expect(startedParent.task.startedAt).toBeInstanceOf(Date)
    expect(
      startedParent.task.systemLog.some(
        (entry) => entry.payload.logType === 'started',
      ),
    ).toBe(true)

    await testModule!.services.taskService.registerTaskCompleted(
      parentTask.id,
      {
        success: true,
        result: { message: 'ok' },
      },
    )

    const childTask =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.taskIdentifier, ON_COMPLETE_TASK_ID),
      })

    if (!childTask) {
      throw new Error('On-complete child task was not created.')
    }

    if (childTask.trigger.kind === 'task_child') {
      expect(childTask.trigger.invokeContext.parentTask.id).toBe(parentTask.id)
    } else {
      throw new Error('Child task was not created with a task_child trigger.')
    }
    expect(childTask.trigger.onComplete).toEqual([
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
        startContext: { __executor: { kind: 'test' } },
      })

    expect(startedChildTask.task.startedAt).toBeInstanceOf(Date)
    expect(
      startedChildTask.task.systemLog.some(
        (entry) => entry.payload.logType === 'started',
      ),
    ).toBe(true)

    const completedChildTask =
      await testModule!.services.taskService.registerTaskCompleted(
        startedChildTask.task.id,
        {
          success: true,
          result: { message: 'ok' },
        },
      )
    expect(completedChildTask.completedAt).toBeInstanceOf(Date)
    expect(completedChildTask.success).toBe(true)
    expect(completedChildTask.error).toBeNull()
    expect(
      completedChildTask.systemLog.some(
        (entry) => entry.payload.logType === 'started',
      ),
    ).toBe(true)

    const chainOne =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.taskIdentifier, CHAIN_ONE_TASK_ID),
      })
    if (!chainOne) {
      throw new Error('Chain one task was not created.')
    }
    expect(chainOne.trigger.kind).toBe('task_child')
    if (chainOne.trigger.kind === 'task_child') {
      expect(chainOne.trigger.onComplete).toBeUndefined()
      expect(chainOne.trigger.invokeContext.parentTask.id).toBe(childTask.id)
    }
    expect(chainOne.data).toEqual({ doubleInheritedPayload: 'from-event' })

    const startedChainOne =
      await testModule!.services.taskService.registerTaskStarted({
        taskId: chainOne.id,
        startContext: { __executor: { kind: 'test' } },
      })
    expect(startedChainOne.task.startedAt).toBeInstanceOf(Date)
    expect(startedChainOne.task.systemLog.at(0)?.payload.logType).toBe(
      'started',
    )

    await testModule!.services.taskService.registerTaskCompleted(chainOne.id, {
      success: true,
      result: { ok: true },
    })

    const parentTaskRecord =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, parentTask.id),
      })

    expect(parentTaskRecord?.success).toBe(true)
    expect(parentTaskRecord?.completedAt).toBeInstanceOf(Date)
    expect(
      parentTaskRecord?.systemLog.some(
        (entry) => entry.payload.logType === 'success',
      ),
    ).toBe(true)

    const events =
      await testModule!.services.ormService.db.query.eventsTable.findMany({
        where: eq(eventsTable.eventIdentifier, LIFECYCLE_EVENT_IDENTIFIER),
      })
    expect(events.length).toBe(1)
  })

  it('creates an app_action task and tracks lifecycle fields', async () => {
    await testModule!.services.taskService.triggerAppActionTask({
      appIdentifier: LIFECYCLE_APP_ID,
      taskIdentifier: APP_ACTION_TASK_ID,
      taskData: { foo: 'bar' },
    })

    const task = await getTaskByIdentifier(testModule!, APP_ACTION_TASK_ID)
    if (!task) {
      throw new Error('App action task was not created.')
    }

    expect(task.trigger.kind).toBe('app_action')
    expect(task.startedAt).toBeNull()
    expect(task.completedAt).toBeNull()
    expect(task.success).toBeNull()
    expect(task.systemLog.length).toBe(0)
    expect(task.updatedAt).toBeInstanceOf(Date)

    const started = await testModule!.services.taskService.registerTaskStarted({
      taskId: task.id,
      startContext: { __executor: { kind: 'test' } },
    })

    expect(started.task.startedAt).toBeInstanceOf(Date)
    expect(started.task.completedAt).toBeNull()
    expect(started.task.systemLog.length).toBe(1)
    expect(started.task.systemLog[0]?.payload.logType).toBe('started')
    expect(started.task.systemLog[0]?.payload.data).toEqual({
      __executor: { kind: 'test' },
    })

    const completed =
      await testModule!.services.taskService.registerTaskCompleted(task.id, {
        success: true,
        result: { message: 'done' },
      })

    expect(completed.completedAt).toBeInstanceOf(Date)
    expect(completed.success).toBe(true)
    expect(completed.systemLog.length).toBe(2)
    expect(completed.systemLog[1]?.payload.logType).toBe('success')
    expect(completed.systemLog[1]?.payload.data).toEqual({
      result: { message: 'done' },
    })
  })

  it('creates an app_action task with a single onComplete handler', async () => {
    const parentTask =
      await testModule!.services.taskService.triggerAppActionTask({
        appIdentifier: LIFECYCLE_APP_ID,
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

    expect(parentTask.trigger.kind).toBe('app_action')
    expect(parentTask.trigger.onComplete).toEqual([
      {
        taskIdentifier: ON_COMPLETE_TASK_ID,
        condition: 'task.success',
        dataTemplate: {
          inheritedData: '{{task.data.testData}}',
        },
      },
    ])

    await testModule!.services.taskService.registerTaskStarted({
      taskId: parentTask.id,
      startContext: { __executor: { kind: 'test' } },
    })

    await testModule!.services.taskService.registerTaskCompleted(
      parentTask.id,
      {
        success: true,
        result: { message: 'parent done' },
      },
    )

    const childTask = await getTaskByIdentifier(
      testModule!,
      ON_COMPLETE_TASK_ID,
    )
    if (!childTask) {
      throw new Error('On-complete child task was not created.')
    }

    expect(childTask.trigger.kind).toBe('task_child')
    if (childTask.trigger.kind === 'task_child') {
      expect(childTask.trigger.invokeContext.parentTask.id).toBe(parentTask.id)
      expect(childTask.trigger.invokeContext.parentTask.success).toBe(true)
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
    const parentTask =
      await testModule!.services.taskService.triggerAppActionTask({
        appIdentifier: LIFECYCLE_APP_ID,
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

    expect(parentTask.trigger.kind).toBe('app_action')
    expect(parentTask.trigger.onComplete).toEqual([
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
      startContext: { __executor: { kind: 'test' } },
    })

    await testModule!.services.taskService.registerTaskCompleted(
      parentTask.id,
      {
        success: true,
        result: { message: 'parent done' },
      },
    )

    const firstChild = await getTaskByIdentifier(
      testModule!,
      ON_COMPLETE_TASK_ID,
    )
    if (!firstChild) {
      throw new Error('First on-complete child task was not created.')
    }

    expect(firstChild.trigger.kind).toBe('task_child')
    if (firstChild.trigger.kind === 'task_child') {
      expect(firstChild.trigger.invokeContext.parentTask.id).toBe(parentTask.id)
      expect(firstChild.trigger.onComplete).toEqual([
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
      startContext: { __executor: { kind: 'test' } },
    })

    await testModule!.services.taskService.registerTaskCompleted(
      firstChild.id,
      {
        success: true,
        result: { message: 'first child done' },
      },
    )

    const secondChild = await getTaskByIdentifier(
      testModule!,
      CHAIN_ONE_TASK_ID,
    )
    if (!secondChild) {
      throw new Error('Second on-complete child task was not created.')
    }

    expect(secondChild.trigger.kind).toBe('task_child')
    if (secondChild.trigger.kind === 'task_child') {
      expect(secondChild.trigger.invokeContext.parentTask.id).toBe(
        firstChild.id,
      )
      expect(secondChild.trigger.onComplete).toBeUndefined()
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
    const parentTask =
      await testModule!.services.taskService.triggerAppActionTask({
        appIdentifier: LIFECYCLE_APP_ID,
        taskIdentifier: APP_ACTION_TASK_ID,
        taskData: { shouldFail: true },
        onComplete: [
          {
            taskIdentifier: ON_COMPLETE_TASK_ID,
            condition: '!task.success',
          },
        ],
      })

    await testModule!.services.taskService.registerTaskStarted({
      taskId: parentTask.id,
      startContext: { __executor: { kind: 'test' } },
    })

    await testModule!.services.taskService.registerTaskCompleted(
      parentTask.id,
      {
        success: false,
        error: {
          code: 'NEGATED_FAILURE',
          message: 'expected failure',
        },
      },
    )

    const childTask = await getTaskByIdentifier(
      testModule!,
      ON_COMPLETE_TASK_ID,
    )
    if (!childTask) {
      throw new Error('On-complete child task was not created.')
    }

    expect(childTask.trigger.kind).toBe('task_child')
    if (childTask.trigger.kind === 'task_child') {
      expect(childTask.trigger.invokeContext.parentTask.success).toBe(false)
    }
  })

  it('creates schedule-triggered tasks and skips duplicates within interval', async () => {
    await testModule!.services.eventService.processScheduledTaskTriggers()

    const firstTask = await getTaskByIdentifier(testModule!, SCHEDULE_TASK_ID)
    if (!firstTask) {
      throw new Error('Schedule task was not created.')
    }

    if (firstTask.trigger.kind === 'schedule') {
      expect(firstTask.trigger.config).toEqual({ interval: 1, unit: 'hours' })
      expect(firstTask.trigger.invokeContext).toEqual({})
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

    const task =
      await testModule!.services.taskService.triggerAppUserActionTask({
        userId,
        appIdentifier: LIFECYCLE_APP_ID,
        taskIdentifier: USER_ACTION_TASK_ID,
        taskData: { from: 'user' },
        targetUserId: userId,
      })

    expect(task.trigger.kind).toBe('user_action')
    if (task.trigger.kind === 'user_action') {
      expect(task.trigger.invokeContext.userId).toBe(userId)
    }
    expect(task.startedAt).toBeNull()
    expect(task.completedAt).toBeNull()
    expect(task.success).toBeNull()
    expect(task.systemLog.length).toBe(0)

    const started = await testModule!.services.taskService.registerTaskStarted({
      taskId: task.id,
      startContext: { __executor: { kind: 'test' } },
    })
    expect(started.task.systemLog.at(0)?.payload.logType).toBe('started')
    expect(started.task.startedAt).toBeInstanceOf(Date)
    expect(started.task.completedAt).toBeNull()

    const completed =
      await testModule!.services.taskService.registerTaskCompleted(task.id, {
        success: true,
        result: { message: 'user-finished' },
      })

    expect(completed.systemLog.at(1)?.payload.logType).toBe('success')
    expect(completed.systemLog.at(1)?.payload.data).toEqual({
      result: { message: 'user-finished' },
    })
    expect(completed.completedAt).toBeInstanceOf(Date)
    expect(completed.success).toBe(true)
  })
})
