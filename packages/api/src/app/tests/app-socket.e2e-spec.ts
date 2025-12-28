/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { CORE_APP_SLUG, LogEntryLevel } from '@lombokapp/types'
import { Logger } from '@nestjs/common'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { io, type Socket } from 'socket.io-client'
import { eventsTable } from 'src/event/entities/event.entity'
import { tasksTable } from 'src/task/entities/task.entity'
import type { TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'
import { usersTable } from 'src/users/entities/user.entity'

import { buildAppClient } from '../../../../app-worker-sdk'

const TEST_MODULE_KEY = 'app_socket'
const SOCKET_TEST_APP_SLUG = 'sockettestapp'
const SOCKET_TEST_APP_SLUG_NO_DB = 'sockettestappnodb'

describe('App Socket Interface', () => {
  let testModule: TestModule | undefined
  const _logger = new Logger(`TestModule[${TEST_MODULE_KEY}]`)
  let socket: Socket | undefined
  let serverBaseUrl: string
  const startServerOnPort = 7000

  const resetTestData = async () => {
    if (socket) {
      socket.disconnect()
      socket = undefined
    }
    await testModule?.resetAppState()
  }

  const createAppToken = async (appIdentifier: string): Promise<string> => {
    return testModule!.services.jwtService.createAppWorkerToken(appIdentifier)
  }

  const connectSocket = async (
    instanceId: string,
    handledTaskIdentifiers: string[] = [],
    _appIdentifier?: string,
  ): Promise<Socket> => {
    const appIdentifier =
      _appIdentifier ??
      (await testModule!.getAppIdentifierBySlug(SOCKET_TEST_APP_SLUG))
    const token = await createAppToken(appIdentifier)
    const socketUrl = `${serverBaseUrl}/apps`

    return new Promise((resolve, reject) => {
      const newSocket = io(socketUrl, {
        auth: {
          instanceId,
          token,
          handledTaskIdentifiers,
        },
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

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
      startServerOnPort,
      // debug: true,
    })

    // Get the platform host from config
    // const platformConfig = testModule.app.get('platform')
    // platformHost = platformConfig?.platformHost ?? 'lombok.localhost'

    // Get the server base URL from the app
    // const app = testModule.app

    serverBaseUrl = `http://localhost:${startServerOnPort}`

    // Verify the app is installed
    const apps = await testModule.services.appService.listAppsAsAdmin(
      {
        id: '1',
        isAdmin: true,
      } as never,
      { enabled: true },
    )

    const socketTestApp = apps.result.find(
      (_app) => _app.slug === SOCKET_TEST_APP_SLUG,
    )
    if (!socketTestApp) {
      throw new Error(
        `Socket test app with slug "${SOCKET_TEST_APP_SLUG}" not found. Make sure it's defined in e2e.setup.ts.`,
      )
    }
  })

  afterEach(async () => {
    await resetTestData()
  })

  afterAll(async () => {
    if (socket) {
      socket.disconnect()
    }
    await testModule?.shutdown()
  })

  it('should connect to the app socket namespace', async () => {
    socket = await connectSocket('test-instance-1')
    expect(socket.connected).toBe(true)
  })

  it('should reject connection with invalid token', () => {
    const socketUrl = `${serverBaseUrl}/apps`

    expect(
      new Promise<void>((resolve, reject) => {
        const invalidSocket = io(socketUrl, {
          auth: {
            instanceId: 'test-instance',
            token: 'invalid-token',
          },
          reconnection: false,
          transports: ['websocket'],
        })

        const timeout = setTimeout(() => {
          invalidSocket.disconnect()
          reject(new Error('Connection should have failed'))
        }, 5000)

        invalidSocket.on('connect', () => {
          clearTimeout(timeout)
          invalidSocket.disconnect()
          reject(new Error('Connection should have been rejected'))
        })

        invalidSocket.on('disconnect', () => {
          clearTimeout(timeout)
          invalidSocket.disconnect()
          resolve()
        })
      }),
    ).resolves.toBeUndefined()
  })

  it('should handle EMIT_EVENT message', async () => {
    socket = await connectSocket('test-instance-1')

    // const response = await sendSocketMessage('EMIT_EVENT', {
    //   eventIdentifier: 'socket-test-app:test_event',
    //   data: { testData: 'value' },
    // })
    const response = await buildAppClient(socket, serverBaseUrl).emitEvent({
      eventIdentifier: 'sockettestappevent',
      data: { testData: 'value' },
    })

    expect(response).toHaveProperty('result')
    if ('result' in response) {
      expect(response.result.success).toBe(true)
    } else {
      throw new Error('Expected result in response')
    }

    // Verify the event was emitted
    const events = await testModule!.services.ormService.db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.eventIdentifier, 'sockettestappevent'))

    expect(events.length).toBeGreaterThan(0)
    expect(events[0]?.eventIdentifier).toBe('sockettestappevent')
    expect(events[0]?.emitterIdentifier).toBe(
      await testModule!.getAppIdentifierBySlug(SOCKET_TEST_APP_SLUG),
    )
  })

  it('should return 409 for a app without db enabled', async () => {
    socket = await connectSocket(
      'test-instance-1',
      [],
      await testModule!.getAppIdentifierBySlug(SOCKET_TEST_APP_SLUG_NO_DB),
    )

    const response = await buildAppClient(
      socket,
      serverBaseUrl,
    ).getLatestDbCredentials()

    if (!('error' in response)) {
      throw new Error('Expected error in response')
    }

    expect(response.error.code).toBe(409)
  })

  it('should handle SAVE_LOG_ENTRY message', async () => {
    socket = await connectSocket('test-instance-1')

    const response = await buildAppClient(socket, serverBaseUrl).saveLogEntry({
      message: 'Test log message',
      level: LogEntryLevel.INFO,
      data: { testKey: 'testValue' },
    })
    if ('error' in response) {
      throw new Error('Expected result in response')
    }
    expect('error' in response).toBe(false)
  })

  it('should handle GET_APP_USER_ACCESS_TOKEN message', async () => {
    socket = await connectSocket('test-instance-1')

    await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const viewer =
      await testModule!.services.ormService.db.query.usersTable.findFirst({
        where: eq(usersTable.username, 'testuser'),
      })

    const response = await buildAppClient(
      socket,
      serverBaseUrl,
    ).getAppUserAccessToken({
      userId: viewer?.id ?? '',
    })

    expect(response).toHaveProperty('result')
    if ('result' in response) {
      expect(response.result.accessToken).toBeDefined()
      expect(response.result.refreshToken).toBeDefined()
      expect(typeof response.result.accessToken).toBe('string')
      expect(typeof response.result.refreshToken).toBe('string')
    } else {
      throw new Error('Expected result in response')
    }
  })

  it('should handle ATTEMPT_START_HANDLE_ANY_AVAILABLE_TASK message', async () => {
    socket = await connectSocket('test-instance-1', ['socket_test_task'])

    // Create a task that the app can handle
    await testModule!.services.taskService.triggerAppActionTask({
      appIdentifier:
        await testModule!.getAppIdentifierBySlug(SOCKET_TEST_APP_SLUG),
      taskIdentifier: 'socket_test_task',
      taskData: { testData: 'value' },
    })

    const response = await buildAppClient(
      socket,
      serverBaseUrl,
    ).attemptStartHandleAnyAvailableTask({
      taskIdentifiers: ['socket_test_task'],
    })

    expect(response).toHaveProperty('result')
    if ('result' in response) {
      expect(response.result.task).toBeDefined()
      expect(response.result.task.taskIdentifier).toBe('socket_test_task')
    } else {
      throw new Error('Expected result in response')
    }
  })

  it('should handle COMPLETE_HANDLE_TASK message', async () => {
    socket = await connectSocket('test-instance-1', ['socket_test_task'])

    // Create and start a task
    await testModule!.services.taskService.triggerAppActionTask({
      appIdentifier:
        await testModule!.getAppIdentifierBySlug(SOCKET_TEST_APP_SLUG),
      taskIdentifier: 'socket_test_task',
      taskData: { testData: 'value' },
    })

    const startResponse = await buildAppClient(
      socket,
      serverBaseUrl,
    ).attemptStartHandleAnyAvailableTask({
      taskIdentifiers: ['socket_test_task'],
    })

    if (!('result' in startResponse)) {
      throw new Error('Failed to start task')
    }

    const taskId = startResponse.result.task.id

    // Complete the task
    const completeResponse = await buildAppClient(
      socket,
      serverBaseUrl,
    ).completeHandleTask({
      taskId,
      success: true,
      result: { message: 'Task completed successfully' },
    })
    if ('error' in completeResponse) {
      throw new Error('Expected successful COMPLETE_HANDLE_TASK response')
    }
    expect('result' in completeResponse).toBe(true)
    if ('result' in completeResponse) {
      expect(completeResponse.result).toBeNull()
    }

    // Verify the task is completed
    const task =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, taskId),
      })

    expect(task?.completedAt).toBeDefined()
    expect(task?.success).toBe(true)
  })

  it('should handle TRIGGER_APP_TASK message', async () => {
    socket = await connectSocket('test-instance-1')

    const response = await buildAppClient(socket, serverBaseUrl).triggerAppTask(
      {
        taskIdentifier: 'socket_test_task',
        inputData: { testInput: 'value' },
      },
    )
    if ('error' in response) {
      throw new Error('Expected successful TRIGGER_APP_TASK response')
    }
    expect('result' in response).toBe(true)
    if ('result' in response) {
      expect(response.result).toBeNull()
    }

    // Verify the task was created
    const tasks = await testModule!.services.ormService.db
      .select()
      .from(tasksTable)
      .where(
        eq(
          tasksTable.ownerIdentifier,
          await testModule!.getAppIdentifierBySlug(SOCKET_TEST_APP_SLUG),
        ),
      )

    const matchingTasks = tasks.filter(
      (task) => task.taskIdentifier === 'socket_test_task',
    )
    expect(matchingTasks.length).toBeGreaterThan(0)
  })

  it('should return error for invalid message format', async () => {
    socket = await connectSocket('test-instance-1')

    const response = await socket.emitWithAck('APP_API', 'invalid json')

    expect(response).toHaveProperty('error')
    if ('error' in response) {
      const errorResponse = response as {
        error: { code: number; message: string }
      }
      expect(errorResponse.error.code).toBe(400)
    }
  })

  it('should return error for unknown message name', async () => {
    socket = await connectSocket('test-instance-1')

    const response = (await socket.emitWithAck(
      'INVALID_MESSAGE',
      'invalid json',
    )) as { error: { code: number; message: string } }
    expect(response).toHaveProperty('error')
    expect(response.error.code).toBe(400)
    expect(response.error.message).toBe('Invalid event')
  })

  it('should receive PENDING_TASKS_NOTIFICATION when tasks are available', async () => {
    const testSocket = await connectSocket('test-instance-1', [
      'socket_test_task',
    ])
    socket = testSocket

    // Wait a bit to ensure socket has fully joined rooms (room joining is async)
    await new Promise((resolve) => {
      setTimeout(resolve, 100)
    })

    // Remove any existing listeners to avoid catching notifications from previous tests
    testSocket.off('PENDING_TASKS_NOTIFICATION')

    const notificationPromise = new Promise<{
      taskIdentifier: string
      count: number
    }>((resolve) => {
      // Use once() instead of on() to ensure we only catch one notification
      testSocket.once('PENDING_TASKS_NOTIFICATION', (data) => {
        resolve(data as { taskIdentifier: string; count: number })
      })
    })

    // Create a task
    await testModule!.services.taskService.triggerAppActionTask({
      appIdentifier:
        await testModule!.getAppIdentifierBySlug(SOCKET_TEST_APP_SLUG),
      taskIdentifier: 'socket_test_task',
      taskData: { testData: 'value' },
    })

    await testModule!.services.taskService.handlePendingTasks()

    const notification = await Promise.race([
      notificationPromise,
      new Promise<never>((_resolve, reject) =>
        setTimeout(() => reject(new Error('Notification timeout')), 5000),
      ),
    ])

    expect(notification.taskIdentifier).toBe('socket_test_task')
    expect(notification.count).toBeGreaterThan(0)
  })

  it('should allow owner to complete their own task without SERVE_APPS permission', async () => {
    // This test verifies that the owner can complete their own tasks
    // The existing test at line 293 already covers this, but this test
    // explicitly verifies the permission logic
    socket = await connectSocket('test-instance-1', ['socket_test_task'])

    // Create and start a task owned by sockettestapp
    await testModule!.services.taskService.triggerAppActionTask({
      appIdentifier:
        await testModule!.getAppIdentifierBySlug(SOCKET_TEST_APP_SLUG),
      taskIdentifier: 'socket_test_task',
      taskData: { testData: 'value' },
    })

    const startResponse = await buildAppClient(
      socket,
      serverBaseUrl,
    ).attemptStartHandleAnyAvailableTask({
      taskIdentifiers: ['socket_test_task'],
    })

    if (!('result' in startResponse)) {
      throw new Error('Failed to start task')
    }

    const taskId = startResponse.result.task.id

    // Complete the task as the owner - should succeed even without SERVE_APPS
    const completeResponse = await buildAppClient(
      socket,
      serverBaseUrl,
    ).completeHandleTask({
      taskId,
      success: true,
      result: { message: 'Task completed successfully' },
    })
    if ('error' in completeResponse) {
      throw new Error('Expected successful COMPLETE_HANDLE_TASK response')
    }
    expect('result' in completeResponse).toBe(true)
    if ('result' in completeResponse) {
      expect(completeResponse.result).toBeNull()
    }

    // Verify the task is completed
    const task =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, taskId),
      })

    expect(task?.completedAt).toBeDefined()
    expect(task?.success).toBe(true)
  })

  it('should reject COMPLETE_HANDLE_TASK when non-owner app does not have SERVE_APPS permission', async () => {
    // Create a task owned by sockettestapp
    const task = await testModule!.services.taskService.triggerAppActionTask({
      appIdentifier:
        await testModule!.getAppIdentifierBySlug(SOCKET_TEST_APP_SLUG),
      taskIdentifier: 'socket_test_task',
      taskData: { testData: 'value' },
    })

    // Try to complete the task as a different app (sockettestappnodb) without SERVE_APPS
    const otherAppSocket = await connectSocket(
      'test-instance-2',
      [],
      await testModule!.getAppIdentifierBySlug(SOCKET_TEST_APP_SLUG_NO_DB),
    )

    const completeResponse = await buildAppClient(
      otherAppSocket,
      serverBaseUrl,
    ).completeHandleTask({
      taskId: task.id,
      success: true,
      result: { message: 'Task completed successfully' },
    })

    // Should fail with 403 (Unauthorized) because the app doesn't have SERVE_APPS
    expect(completeResponse).toHaveProperty('error')
    if ('error' in completeResponse) {
      expect(completeResponse.error.code).toBe(403)
    } else {
      throw new Error('Expected error in response')
    }

    otherAppSocket.disconnect()
  })

  it('should reject ATTEMPT_START_HANDLE_WORKER_TASK_BY_ID when non-owner app does not have SERVE_APPS permission', async () => {
    // Create a task owned by sockettestapp
    const task = await testModule!.services.taskService.triggerAppActionTask({
      appIdentifier:
        await testModule!.getAppIdentifierBySlug(SOCKET_TEST_APP_SLUG),
      taskIdentifier: 'socket_test_task',
      taskData: { testData: 'value' },
    })

    // Try to start the task as a different app (sockettestappnodb) without SERVE_APPS
    const otherAppSocket = await connectSocket(
      'test-instance-2',
      [],
      await testModule!.getAppIdentifierBySlug(SOCKET_TEST_APP_SLUG_NO_DB),
    )

    const response = await buildAppClient(
      otherAppSocket,
      serverBaseUrl,
    ).attemptStartHandleTaskById({
      taskId: task.id,
    })

    // Should fail with 403 (Unauthorized) because the app doesn't have SERVE_APPS
    expect(response).toHaveProperty('error')
    if ('error' in response) {
      expect(response.error.code).toBe(403)
    } else {
      throw new Error('Expected error in response')
    }

    otherAppSocket.disconnect()
  })

  it('should reject COMPLETE_HANDLE_TASK when app with SERVE_APPS tries to complete non-worker task', async () => {
    // Create a task owned by sockettestapp with handlerType 'external' (not 'worker')
    const task = await testModule!.services.taskService.triggerAppActionTask({
      appIdentifier:
        await testModule!.getAppIdentifierBySlug(SOCKET_TEST_APP_SLUG),
      taskIdentifier: 'socket_test_task',
      taskData: { testData: 'value' },
    })

    // Try to complete the task as core app (which has SERVE_APPS) but task is not a worker task
    const coreAppSocket = await connectSocket(
      'test-instance-core',
      [],
      await testModule!.getAppIdentifierBySlug(CORE_APP_SLUG),
    )

    const completeResponse = await buildAppClient(
      coreAppSocket,
      serverBaseUrl,
    ).completeHandleTask({
      taskId: task.id,
      success: true,
      result: { message: 'Task completed successfully' },
    })

    // Should fail with 400 (BadRequest) because task is not a worker task
    expect(completeResponse).toHaveProperty('error')
    if ('error' in completeResponse) {
      expect(completeResponse.error.code).toBe(404)
    } else {
      throw new Error('Expected error in response')
    }

    coreAppSocket.disconnect()
  })

  it('should reject ATTEMPT_START_HANDLE_WORKER_TASK_BY_ID when app with SERVE_APPS tries to start non-worker task', async () => {
    // Create a task owned by sockettestapp with handlerType 'external' (not 'worker')
    const task = await testModule!.services.taskService.triggerAppActionTask({
      appIdentifier:
        await testModule!.getAppIdentifierBySlug(SOCKET_TEST_APP_SLUG),
      taskIdentifier: 'socket_test_task',
      taskData: { testData: 'value' },
    })

    // Try to start the task as core app (which has SERVE_APPS) but task is not a worker task
    const coreAppSocket = await connectSocket(
      'test-instance-core',
      [],
      await testModule!.getAppIdentifierBySlug(CORE_APP_SLUG),
    )

    const response = await buildAppClient(
      coreAppSocket,
      serverBaseUrl,
    ).attemptStartHandleTaskById({
      taskId: task.id,
    })

    // Should fail with 400 (BadRequest) because task is not a worker task
    expect(response).toHaveProperty('error')
    if ('error' in response) {
      expect(response.error.code).toBe(404)
    } else {
      throw new Error('Expected error in response')
    }

    coreAppSocket.disconnect()
  })
})

/* eslint-enable @typescript-eslint/no-unsafe-assignment */
