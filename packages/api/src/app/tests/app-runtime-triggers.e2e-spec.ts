import type { RegisterableTriggerConfig } from '@lombokapp/types'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test'
import { and, eq } from 'drizzle-orm'
import { io, type Socket } from 'socket.io-client'
import { appsTable } from 'src/app/entities/app.entity'
import { appRuntimeTriggersTable } from 'src/app/entities/app-runtime-trigger.entity'
import { tasksTable } from 'src/task/entities/task.entity'
import type { TestModule } from 'src/test/test.types'
import { buildTestModule } from 'src/test/test.util'

import { buildAppClient } from '../../../../app-worker-sdk'

const TEST_MODULE_KEY = 'app_runtime_triggers'
const SOCKET_TEST_APP_SLUG = 'sockettestapp'

describe('App Runtime Triggers', () => {
  let testModule: TestModule | undefined
  let socket: Socket | undefined
  let serverBaseUrl: string
  const startServerOnPort = 7032

  const createAppToken = (appIdentifier: string): Promise<string> =>
    testModule!.services.jwtService.mintAppToken(appIdentifier)

  const connectSocket = async (instanceId: string): Promise<Socket> => {
    const appIdentifier =
      testModule!.getInstalledAppIdentifier(SOCKET_TEST_APP_SLUG)
    const token = await createAppToken(appIdentifier)
    const socketUrl = `${serverBaseUrl}/apps`

    return new Promise((resolve, reject) => {
      const newSocket = io(socketUrl, {
        auth: { instanceId, token },
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
    })
    serverBaseUrl = `http://localhost:${startServerOnPort}`
    await testModule.installLocalAppBundles([SOCKET_TEST_APP_SLUG])
  })

  beforeEach(async () => {
    await testModule!.installLocalAppBundles([SOCKET_TEST_APP_SLUG])
    socket = await connectSocket('test-instance-runtime-triggers')
  })

  afterEach(async () => {
    if (socket) {
      socket.disconnect()
      socket = undefined
    }
    await testModule!.resetAppState()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  const scheduleTriggerOnce = (overrides?: {
    triggerKey?: string
    taskIdentifier?: string
  }): RegisterableTriggerConfig => ({
    kind: 'schedule',
    triggerKey: overrides?.triggerKey ?? 'runtime-schedule-1',
    config: { interval: 1, unit: 'minutes' },
    taskIdentifier: overrides?.taskIdentifier ?? 'socket_test_task',
  })

  const eventTriggerOnce = (overrides?: {
    eventIdentifier?: string
    taskIdentifier?: string
    triggerKey?: string
  }): RegisterableTriggerConfig => ({
    kind: 'event',
    eventIdentifier: overrides?.eventIdentifier ?? 'dummy_event',
    taskIdentifier: overrides?.taskIdentifier ?? 'socket_test_task',
    ...(overrides?.triggerKey ? { triggerKey: overrides.triggerKey } : {}),
  })

  it('registers, lists, and unregisters a schedule trigger', async () => {
    const client = buildAppClient(socket!, serverBaseUrl)

    const registerResp = await client.registerAppTrigger({
      trigger: scheduleTriggerOnce(),
    })
    if (!('result' in registerResp)) {
      throw new Error('register failed')
    }
    const triggerId = registerResp.result.triggerId
    expect(triggerId).toBeDefined()

    const listResp = await client.listAppTriggers({})
    if (!('result' in listResp)) {
      throw new Error('list failed')
    }
    expect(listResp.result.triggers).toHaveLength(1)
    expect(listResp.result.triggers[0]?.id).toBe(triggerId)
    expect(listResp.result.triggers[0]?.kind).toBe('schedule')

    const unregisterResp = await client.unregisterAppTrigger({ triggerId })
    if (!('result' in unregisterResp)) {
      throw new Error('unregister failed')
    }
    expect(unregisterResp.result.success).toBe(true)

    const listAfter = await client.listAppTriggers({})
    if (!('result' in listAfter)) {
      throw new Error('list-after failed')
    }
    expect(listAfter.result.triggers).toHaveLength(0)
  })

  it('rejects registration with unknown taskIdentifier', async () => {
    const client = buildAppClient(socket!, serverBaseUrl)
    const resp = await client.registerAppTrigger({
      trigger: scheduleTriggerOnce({ taskIdentifier: 'no_such_task' }),
    })
    if (!('error' in resp)) {
      throw new Error('expected error')
    }
    expect(resp.error.code).toBe(400)
    expect((resp.error.details as { code?: string } | undefined)?.code).toBe(
      'UNKNOWN_TASK',
    )
  })

  it('rejects core: event subscription not in subscribedCoreEvents', async () => {
    const client = buildAppClient(socket!, serverBaseUrl)
    const resp = await client.registerAppTrigger({
      trigger: eventTriggerOnce({ eventIdentifier: 'core:object_added' }),
    })
    if (!('error' in resp)) {
      throw new Error('expected error')
    }
    expect(resp.error.code).toBe(400)
    expect((resp.error.details as { code?: string } | undefined)?.code).toBe(
      'EVENT_NOT_SUBSCRIBED',
    )
  })

  it('rejects duplicate schedule names', async () => {
    const client = buildAppClient(socket!, serverBaseUrl)
    const first = await client.registerAppTrigger({
      trigger: scheduleTriggerOnce({ triggerKey: 'dup-schedule' }),
    })
    if (!('result' in first)) {
      throw new Error('first register failed')
    }

    const second = await client.registerAppTrigger({
      trigger: scheduleTriggerOnce({ triggerKey: 'dup-schedule' }),
    })
    if (!('error' in second)) {
      throw new Error('expected conflict')
    }
    expect(second.error.code).toBe(409)
  })

  it('fires a task when its runtime schedule trigger ticks', async () => {
    const client = buildAppClient(socket!, serverBaseUrl)
    const registered = await client.registerAppTrigger({
      trigger: scheduleTriggerOnce({ triggerKey: 'fire-schedule' }),
    })
    if (!('result' in registered)) {
      throw new Error('register failed')
    }
    const triggerId = registered.result.triggerId

    await testModule!.services.eventService.processScheduledTaskTriggers()

    const appIdentifier =
      testModule!.getInstalledAppIdentifier(SOCKET_TEST_APP_SLUG)
    const tasks = await testModule!.services.ormService.db
      .select()
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.ownerId, appIdentifier),
          eq(tasksTable.taskIdentifier, 'socket_test_task'),
        ),
      )

    const fired = tasks.find(
      (task) =>
        task.invocation.kind === 'schedule' &&
        task.invocation.invokeContext.runtimeTriggerId === triggerId,
    )
    expect(fired).toBeDefined()
  })

  it('fires a task when its runtime event trigger matches an emitted event', async () => {
    const client = buildAppClient(socket!, serverBaseUrl)
    const registered = await client.registerAppTrigger({
      trigger: eventTriggerOnce({ eventIdentifier: 'dummy_event' }),
    })
    if (!('result' in registered)) {
      throw new Error('register failed')
    }
    const triggerId = registered.result.triggerId

    const appIdentifier =
      testModule!.getInstalledAppIdentifier(SOCKET_TEST_APP_SLUG)
    await testModule!.services.eventService.emitEvent({
      emitterIdentifier: appIdentifier,
      eventIdentifier: 'dummy_event',
      data: { fromTest: true },
    })

    const tasks = await testModule!.services.ormService.db
      .select()
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.ownerId, appIdentifier),
          eq(tasksTable.taskIdentifier, 'socket_test_task'),
        ),
      )

    const fired = tasks.find(
      (task) =>
        task.invocation.kind === 'event' &&
        task.invocation.invokeContext.runtimeTriggerId === triggerId,
    )
    expect(fired).toBeDefined()
  })

  it('stops firing after the trigger is unregistered', async () => {
    const client = buildAppClient(socket!, serverBaseUrl)
    const registered = await client.registerAppTrigger({
      trigger: eventTriggerOnce({ eventIdentifier: 'dummy_event' }),
    })
    if (!('result' in registered)) {
      throw new Error('register failed')
    }
    const triggerId = registered.result.triggerId

    await client.unregisterAppTrigger({ triggerId })

    const appIdentifier =
      testModule!.getInstalledAppIdentifier(SOCKET_TEST_APP_SLUG)
    await testModule!.services.eventService.emitEvent({
      emitterIdentifier: appIdentifier,
      eventIdentifier: 'dummy_event',
      data: { fromTest: true },
    })

    const tasks = await testModule!.services.ormService.db
      .select()
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.ownerId, appIdentifier),
          eq(tasksTable.taskIdentifier, 'socket_test_task'),
        ),
      )

    const fired = tasks.find(
      (task) =>
        task.invocation.kind === 'event' &&
        task.invocation.invokeContext.runtimeTriggerId === triggerId,
    )
    expect(fired).toBeUndefined()
  })

  it('cascade-deletes triggers when the app is uninstalled', async () => {
    const client = buildAppClient(socket!, serverBaseUrl)
    const registered = await client.registerAppTrigger({
      trigger: scheduleTriggerOnce({ triggerKey: 'uninstall-cascade' }),
    })
    if (!('result' in registered)) {
      throw new Error('register failed')
    }

    const appIdentifier =
      testModule!.getInstalledAppIdentifier(SOCKET_TEST_APP_SLUG)
    const app =
      await testModule!.services.ormService.db.query.appsTable.findFirst({
        where: eq(appsTable.identifier, appIdentifier),
      })
    if (!app) {
      throw new Error('test app missing')
    }
    // Disconnect first so uninstall's disconnect step doesn't race the socket
    // we still hold from beforeEach.
    socket?.disconnect()
    socket = undefined

    await testModule!.services.appService.uninstallApp(app)

    const remaining = await testModule!.services.ormService.db
      .select()
      .from(appRuntimeTriggersTable)
      .where(eq(appRuntimeTriggersTable.appId, app.id))
    expect(remaining).toHaveLength(0)
  })
})
