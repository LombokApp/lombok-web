import type { RealtimeEnvelope } from '@lombokapp/types'
import { REALTIME_EVENT } from '@lombokapp/types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { io, type Socket } from 'socket.io-client'
// Type-only: a runtime import roots the realtime.service↔socket/task cycle (TDZ).
// The class is loaded dynamically in beforeAll, after the graph is evaluated.
import type { RealtimeService } from 'src/socket/realtime.service'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
} from 'src/test/test.util'

const TEST_MODULE_KEY = 'user_socket'
const startServerOnPort = 7006

describe('User Socket - Realtime envelope delivery', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient
  let serverBaseUrl: string
  let realtime: RealtimeService
  const openSockets: Socket[] = []

  const connectUserSocket = (token: string): Promise<Socket> => {
    return new Promise((resolve, reject) => {
      const socket = io(`${serverBaseUrl}/user`, {
        auth: { token },
        reconnection: false,
        transports: ['websocket'],
      })
      openSockets.push(socket)
      const timeout = setTimeout(() => {
        reject(new Error('Socket connection timeout'))
      }, 10000)
      socket.on('connect', () => {
        clearTimeout(timeout)
        resolve(socket)
      })
      socket.on('connect_error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })
  }

  const getViewerUserId = async (token: string): Promise<string> => {
    const res = await apiClient(token).GET('/api/v1/viewer')
    return res.data!.user.id
  }

  /** Resolve with the first envelope matching `predicate`, or null after the window. */
  const nextEnvelope = (
    socket: Socket,
    predicate: (envelope: RealtimeEnvelope) => boolean,
    timeoutMs = 5000,
  ): Promise<RealtimeEnvelope | null> => {
    return new Promise((resolve) => {
      const state: { timer?: ReturnType<typeof setTimeout> } = {}
      const handler = (envelope: RealtimeEnvelope) => {
        if (!predicate(envelope)) {
          return
        }
        clearTimeout(state.timer)
        socket.off(REALTIME_EVENT, handler)
        resolve(envelope)
      }
      state.timer = setTimeout(() => {
        socket.off(REALTIME_EVENT, handler)
        resolve(null)
      }, timeoutMs)
      socket.on(REALTIME_EVENT, handler)
    })
  }

  /** Emit a folder subscribe and resolve with the error payload, or null if none arrives. */
  const trySubscribe = (
    socket: Socket,
    folderId: string,
    timeoutMs = 1500,
  ): Promise<{ folderId: string; error: string } | null> => {
    return new Promise((resolve) => {
      socket.once('subscribe_error', (data) =>
        resolve(data as { folderId: string; error: string }),
      )
      socket.emit('subscribe', { folderId })
      setTimeout(() => resolve(null), timeoutMs)
    })
  }

  const markerOf = (envelope: RealtimeEnvelope): unknown =>
    (envelope.event.data as Record<string, unknown> | undefined)?.marker

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
      startServerOnPort,
    })
    apiClient = testModule.apiClient
    serverBaseUrl = `http://localhost:${startServerOnPort}`
    const mod = await import('src/socket/realtime.service')
    realtime = await testModule.resolveDep(mod.RealtimeService)
  })

  afterEach(async () => {
    while (openSockets.length) {
      openSockets.pop()?.disconnect()
    }
    await testModule?.resetAppState()
    testModule?.cleanupMinioTestBuckets()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  // --- Connection auth ---

  it('rejects a connection with an invalid token', async () => {
    const result = await new Promise<'connected' | 'disconnected'>(
      (resolve) => {
        const socket = io(`${serverBaseUrl}/user`, {
          auth: { token: 'not-a-real-token' },
          reconnection: false,
          transports: ['websocket'],
        })
        openSockets.push(socket)
        const timeout = setTimeout(() => resolve('disconnected'), 5000)
        socket.on('connect', () => {
          clearTimeout(timeout)
          resolve('connected')
        })
        // Middleware rejection surfaces as connect_error.
        socket.on('connect_error', () => {
          clearTimeout(timeout)
          resolve('disconnected')
        })
        socket.on('disconnect', () => {
          clearTimeout(timeout)
          resolve('disconnected')
        })
      },
    )
    expect(result).toBe('disconnected')
  })

  // --- User-room routing ---

  it('auto-joins the user room and receives a user-scoped envelope', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'user_rt_1',
      password: '123',
    })
    const userId = await getViewerUserId(accessToken)
    const socket = await connectUserSocket(accessToken)

    const received = nextEnvelope(
      socket,
      (e) => e.event.resource === 'user.apps' && markerOf(e) === 'u1',
    )
    realtime.toUser(userId, {
      resource: 'user.apps',
      action: 'changed',
      data: { marker: 'u1' },
    })

    const envelope = await received
    expect(envelope).not.toBeNull()
    expect(envelope!.scope).toEqual({ kind: 'user', userId })
    expect(markerOf(envelope!)).toBe('u1')
  })

  it('does not deliver a user-scoped envelope to a different user', async () => {
    const {
      session: { accessToken: token1 },
    } = await createTestUser(testModule!, {
      username: 'user_rt_2a',
      password: '123',
    })
    const {
      session: { accessToken: token2 },
    } = await createTestUser(testModule!, {
      username: 'user_rt_2b',
      password: '123',
    })
    const userId1 = await getViewerUserId(token1)

    await connectUserSocket(token1)
    const socket2 = await connectUserSocket(token2)

    const leaked = nextEnvelope(socket2, () => true, 1500)
    realtime.toUser(userId1, {
      resource: 'user.apps',
      action: 'changed',
      data: { marker: 'only-user-1' },
    })

    expect(await leaked).toBeNull()
  })

  // --- Folder-room ACL (subscribe gate) ---

  it('lets the folder owner subscribe to its room', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'user_rt_owner',
      password: '123',
    })
    const { folder } = await createTestFolder({
      accessToken,
      folderName: 'Owner Folder',
      testModule,
      mockFiles: [],
      apiClient,
    })

    const socket = await connectUserSocket(accessToken)
    expect(await trySubscribe(socket, folder.id)).toBeNull()
  })

  it('lets a user the folder is shared with subscribe to its room', async () => {
    const {
      session: { accessToken: ownerToken },
    } = await createTestUser(testModule!, {
      username: 'user_rt_share_owner',
      password: '123',
    })
    const {
      session: { accessToken: shareeToken },
    } = await createTestUser(testModule!, {
      username: 'user_rt_sharee',
      password: '123',
    })
    const shareeId = await getViewerUserId(shareeToken)

    const { folder } = await createTestFolder({
      accessToken: ownerToken,
      folderName: 'Shared Folder',
      testModule,
      mockFiles: [],
      apiClient,
    })
    await apiClient(ownerToken).POST(
      '/api/v1/folders/{folderId}/shares/{userId}',
      {
        params: { path: { folderId: folder.id, userId: shareeId } },
        body: { permissions: ['OBJECT_EDIT'] },
      },
    )

    const socket = await connectUserSocket(shareeToken)
    expect(await trySubscribe(socket, folder.id)).toBeNull()
  })

  it('rejects a folder subscribe from a user with no access', async () => {
    const {
      session: { accessToken: ownerToken },
    } = await createTestUser(testModule!, {
      username: 'user_rt_priv_owner',
      password: '123',
    })
    const {
      session: { accessToken: otherToken },
    } = await createTestUser(testModule!, {
      username: 'user_rt_priv_other',
      password: '123',
    })

    const { folder } = await createTestFolder({
      accessToken: ownerToken,
      folderName: 'Private Folder',
      testModule,
      mockFiles: [],
      apiClient,
    })

    const socket = await connectUserSocket(otherToken)
    const error = await trySubscribe(socket, folder.id)
    expect(error).not.toBeNull()
    expect(error!.folderId).toBe(folder.id)
    expect(error!.error).toBe('Access denied')
  })

  // --- Folder-room routing ---

  it('delivers a folder-scoped envelope after subscribe and stops after unsubscribe', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'user_rt_folder',
      password: '123',
    })
    const { folder } = await createTestFolder({
      accessToken,
      folderName: 'Routing Folder',
      testModule,
      mockFiles: [],
      apiClient,
    })

    const socket = await connectUserSocket(accessToken)

    expect(await trySubscribe(socket, folder.id, 500)).toBeNull()

    const received = nextEnvelope(
      socket,
      (e) => e.event.resource === 'folder.event' && markerOf(e) === 'in-room',
    )
    realtime.toFolder(folder.id, {
      resource: 'folder.event',
      action: 'created',
      id: 'evt-1',
      data: { marker: 'in-room' },
    })
    const envelope = await received
    expect(envelope).not.toBeNull()
    expect(envelope!.scope).toEqual({ kind: 'folder', folderId: folder.id })
    expect(markerOf(envelope!)).toBe('in-room')

    // Leave the room — subsequent folder envelopes must not arrive.
    await new Promise<void>((resolve) => {
      socket.emit('unsubscribe', { folderId: folder.id })
      setTimeout(resolve, 500)
    })
    const afterLeave = nextEnvelope(
      socket,
      (e) => e.event.resource === 'folder.event',
      1500,
    )
    realtime.toFolder(folder.id, {
      resource: 'folder.event',
      action: 'created',
      id: 'evt-2',
      data: { marker: 'after-leave' },
    })
    expect(await afterLeave).toBeNull()
  })

  it('does not deliver a folder-scoped envelope before subscribe', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'user_rt_nosub',
      password: '123',
    })
    const { folder } = await createTestFolder({
      accessToken,
      folderName: 'No-Sub Folder',
      testModule,
      mockFiles: [],
      apiClient,
    })

    const socket = await connectUserSocket(accessToken)

    const leaked = nextEnvelope(
      socket,
      (e) => e.event.resource === 'folder.event',
      1500,
    )
    realtime.toFolder(folder.id, {
      resource: 'folder.event',
      action: 'created',
      id: 'evt-x',
      data: { marker: 'never' },
    })
    expect(await leaked).toBeNull()
  })

  // --- Server room (admin only) ---

  it('auto-joins admins to the server room and delivers server-scoped envelopes', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'user_rt_admin',
      password: '123',
      admin: true,
    })

    const socket = await connectUserSocket(accessToken)

    const received = nextEnvelope(
      socket,
      (e) =>
        e.event.resource === 'server.event' && markerOf(e) === 'admin-only',
    )
    realtime.toServer({
      resource: 'server.event',
      action: 'created',
      id: 'srv-evt-1',
      data: { marker: 'admin-only' },
    })
    const envelope = await received
    expect(envelope).not.toBeNull()
    expect(envelope!.scope).toEqual({ kind: 'server' })
    expect(markerOf(envelope!)).toBe('admin-only')
  })

  it('does not deliver server-scoped envelopes to non-admins', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'user_rt_nonadmin',
      password: '123',
    })

    const socket = await connectUserSocket(accessToken)

    const leaked = nextEnvelope(
      socket,
      (e) => e.event.resource === 'server.event',
      1500,
    )
    realtime.toServer({
      resource: 'server.event',
      action: 'created',
      id: 'srv-evt-2',
      data: { marker: 'should-not-arrive' },
    })
    expect(await leaked).toBeNull()
  })
})
