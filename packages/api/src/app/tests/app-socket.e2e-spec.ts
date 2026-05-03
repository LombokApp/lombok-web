/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { LogEntryLevel } from '@lombokapp/types'
import { Logger } from '@nestjs/common'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test'
import { eq } from 'drizzle-orm'
import { io, type Socket } from 'socket.io-client'
import { eventsTable } from 'src/event/entities/event.entity'
import { runWithThreadContext } from 'src/shared/thread-context'
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
    const appIdentifier = _appIdentifier ?? SOCKET_TEST_APP_SLUG
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

    await testModule.installLocalAppBundles([SOCKET_TEST_APP_SLUG])

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

  beforeEach(async () => {
    await testModule!.installLocalAppBundles([SOCKET_TEST_APP_SLUG])
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
    expect(events[0]?.emitterIdentifier).toBe(SOCKET_TEST_APP_SLUG)
  })

  it('should return 409 for a app without db enabled', async () => {
    await testModule!.installLocalAppBundles([SOCKET_TEST_APP_SLUG_NO_DB])
    socket = await connectSocket(
      'test-instance-1',
      [],
      SOCKET_TEST_APP_SLUG_NO_DB,
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
    await testModule!.installLocalAppBundles([SOCKET_TEST_APP_SLUG])
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

    const {
      session: { accessToken: userToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const viewer =
      await testModule!.services.ormService.db.query.usersTable.findFirst({
        where: eq(usersTable.username, 'testuser'),
      })
    const appIdentifier = SOCKET_TEST_APP_SLUG
    // enable the app for the viewer
    const enableAppResponse = await testModule!
      .apiClient(userToken)
      .POST(`/api/v1/user/apps/{appIdentifier}/settings`, {
        params: { path: { appIdentifier } },
        body: {
          folderScopePermissionsDefault: null,
          enabled: true,
          permissions: ['READ_USER'],
          folderScopeEnabledDefault: true,
        },
      })

    expect(enableAppResponse.response.status).toBe(201)

    const response = await buildAppClient(
      socket,
      serverBaseUrl,
    ).getAppUserAccessToken({
      userId: viewer?.id ?? '',
    })

    if ('result' in response) {
      expect(response.result.accessToken).toBeDefined()
      expect(response.result.refreshToken).toBeDefined()
      expect(typeof response.result.accessToken).toBe('string')
      expect(typeof response.result.refreshToken).toBe('string')
    } else {
      console.log(`'result' not in response:`, response)
      throw new Error('Expected result in response')
    }
  })

  it('should handle TRIGGER_APP_TASK message', async () => {
    await testModule!.installLocalAppBundles([SOCKET_TEST_APP_SLUG])
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
      expect(response.result.taskId).toBeDefined()
      expect(typeof response.result.taskId).toBe('string')
    }

    // Verify the task was created
    const tasks = await testModule!.services.ormService.db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.ownerIdentifier, SOCKET_TEST_APP_SLUG))

    const matchingTasks = tasks.filter(
      (task) => task.taskIdentifier === 'socket_test_task',
    )
    expect(matchingTasks.length).toBeGreaterThan(0)
  })

  it('stamps runtime executorMetadata on REPORT_TASK_UPDATE based on the worker-daemon instanceId', async () => {
    await testModule!.installLocalAppBundles([SOCKET_TEST_APP_SLUG])

    // Seed a task that's been started so the update is accepted.
    const task = await runWithThreadContext(crypto.randomUUID(), async () =>
      testModule!.services.taskService.triggerAppActionTask({
        appIdentifier: SOCKET_TEST_APP_SLUG,
        taskIdentifier: 'socket_test_task',
        taskData: { seed: 'for-update' },
      }),
    )
    await testModule!.services.taskService.registerTaskStarted({
      taskId: task.id,
      executorMetadata: {
        type: 'runtime',
        metadata: { workerIdentifier: 'minimal_worker' },
      },
    })

    // Connect as a runtime worker — the gateway parses the worker
    // identifier out of the `worker-daemon--{workerIdentifier}--{executionId}`
    // instanceId convention.
    socket = await connectSocket('worker-daemon--minimal_worker--exec-1', [
      'socket_test_task',
    ])

    const response = await buildAppClient(
      socket,
      serverBaseUrl,
    ).reportTaskProgress({
      taskId: task.id,
      progressReport: { details: { percent: 42 } },
    })
    expect('result' in response).toBe(true)

    const stored =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, task.id),
      })
    expect(stored!.progressReports).toHaveLength(1)
    const recorded = stored!.progressReports[0] as {
      details?: { percent?: number }
      executorMetadata?: { type: string; metadata: Record<string, unknown> }
    }
    expect(recorded.details?.percent).toBe(42)
    expect(recorded.executorMetadata?.type).toBe('runtime')
    expect(recorded.executorMetadata?.metadata.workerIdentifier).toBe(
      'minimal_worker',
    )
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
})

/* eslint-enable @typescript-eslint/no-unsafe-assignment */
