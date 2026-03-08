import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test'
import { io, type Socket } from 'socket.io-client'
import { AppService } from 'src/app/services/app.service'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
} from 'src/test/test.util'
import { DUMMY_APP_SLUG } from 'test/e2e.contants'

import { AppUserSocketService } from '../app-user-socket.service'

const TEST_MODULE_KEY = 'app_user_socket'
const startServerOnPort = 7004

/** Decode a JWT's payload to extract the userId (sub = "app_user:<id>:<appIdentifier>") */
function userIdFromToken(token: string): string {
  const payload = JSON.parse(
    Buffer.from(token.split('.')[1]!, 'base64url').toString(),
  ) as { sub: string }
  return payload.sub.split(':')[1]!
}

describe('AppUser Socket - Scope-Based Subscriptions', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient
  let serverBaseUrl: string
  let socket: Socket | undefined

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

  const enableAppAsAdmin = async (appIdentifier: string) => {
    const {
      session: { accessToken: adminToken },
    } = await createTestUser(testModule!, {
      username: `admin_${Math.random().toString(36).slice(2, 8)}`,
      password: '123',
      admin: true,
    })

    await apiClient(adminToken).PUT(
      `/api/v1/server/apps/{appIdentifier}/enabled`,
      {
        params: { path: { appIdentifier } },
        body: { enabled: true },
      },
    )

    return adminToken
  }

  const enableAppForUser = async (
    accessToken: string,
    appIdentifier: string,
  ) => {
    await apiClient(accessToken).POST(
      `/api/v1/user/apps/{appIdentifier}/settings`,
      {
        params: { path: { appIdentifier } },
        body: {
          enabled: true,
          folderScopeEnabledDefault: true,
          folderScopePermissionsDefault: null,
          permissions: null,
        },
      },
    )
  }

  const enableAppForFolder = async (
    accessToken: string,
    folderId: string,
    appIdentifier: string,
  ) => {
    await apiClient(accessToken).PATCH(
      `/api/v1/folders/{folderId}/app-settings`,
      {
        params: { path: { folderId } },
        body: {
          [appIdentifier]: { enabled: true },
        },
      },
    )
  }

  /** Create an app-user token for the given user + app */
  const getAppUserToken = async (
    userId: string,
    appIdentifier: string,
  ): Promise<string> => {
    const appService = await testModule!.resolveDep(AppService)
    const { accessToken } = await appService.createAppUserAccessTokenAsApp({
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

  beforeEach(async () => {
    await testModule!.installLocalAppBundles([DUMMY_APP_SLUG])
  })

  afterEach(async () => {
    if (socket) {
      socket.disconnect()
      socket = undefined
    }
    await testModule?.resetAppState()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  // --- Connection tests ---

  it('should connect and auto-join user room, receiving user-scoped ASYNC_UPDATE', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'socket_user_1',
      password: '123',
    })

    const userId = userIdFromToken(accessToken)
    const appIdentifier =
      await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
    await enableAppAsAdmin(appIdentifier)
    await enableAppForUser(accessToken, appIdentifier)
    const appUserToken = await getAppUserToken(userId, appIdentifier)

    socket = await connectAppUserSocket(appUserToken)
    expect(socket.connected).toBe(true)

    // Emit a user-scoped update and verify the socket receives it
    const appUserSocketService =
      await testModule!.resolveDep(AppUserSocketService)

    const testUpdate = {
      type: 'progress' as const,
      data: { percent: 50, message: 'Halfway' },
      timestamp: new Date().toISOString(),
    }

    const received = await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Expected ASYNC_UPDATE but got none')),
        5000,
      )
      socket!.once('ASYNC_UPDATE', (data) => {
        clearTimeout(timeout)
        resolve(data)
      })
      appUserSocketService.emitAsyncUpdate(
        {
          correlationKey: 'ck-user-1',
          source: 'test',
          taskIdentifier: 'testtask',
          targetLocationObjectKey: null,
          targetUserId: userId,
          targetLocationFolderId: null,
        },
        testUpdate as never,
      )
    })

    expect(received).toBeDefined()
    expect((received as { correlationKey: string }).correlationKey).toBe(
      'ck-user-1',
    )
    expect((received as { type: string }).type).toBe('progress')
  })

  it('should reject connection with invalid token', async () => {
    const socketUrl = `${serverBaseUrl}/app-user`

    const result = await new Promise<'disconnected' | 'connected'>(
      (resolve) => {
        const invalidSocket = io(socketUrl, {
          auth: { token: 'invalid-token' },
          reconnection: false,
          transports: ['websocket'],
        })

        const timeout = setTimeout(() => {
          invalidSocket.disconnect()
          resolve('disconnected')
        }, 5000)

        invalidSocket.on('connect', () => {
          clearTimeout(timeout)
          invalidSocket.disconnect()
          resolve('connected')
        })

        invalidSocket.on('disconnect', () => {
          clearTimeout(timeout)
          invalidSocket.disconnect()
          resolve('disconnected')
        })
      },
    )

    expect(result).toBe('disconnected')
  })

  // --- Folder subscription tests ---

  it('should allow folder subscribe when user has folder access and app is enabled for folder', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'socket_user_2',
      password: '123',
    })

    const appIdentifier =
      await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
    await enableAppAsAdmin(appIdentifier)
    await enableAppForUser(accessToken, appIdentifier)

    const { folder } = await createTestFolder({
      accessToken,
      folderName: 'ACL Test Folder',
      testModule,
      mockFiles: [],
      apiClient,
    })

    await enableAppForFolder(accessToken, folder.id, appIdentifier)

    const userId = userIdFromToken(accessToken)
    const appUserToken = await getAppUserToken(userId, appIdentifier)
    socket = await connectAppUserSocket(appUserToken)

    // Subscribe and verify no error is emitted
    const subscribeError = await new Promise<unknown>((resolve) => {
      socket!.once('subscribe_error', (data) => resolve(data))
      socket!.emit('subscribe', {
        folderId: folder.id,
        appIdentifier,
      })
      setTimeout(() => resolve(null), 1000)
    })

    expect(subscribeError).toBeNull()
  })

  it('should reject folder subscribe when user has NO folder access', async () => {
    // User 1 owns the folder
    const {
      session: { accessToken: ownerToken },
    } = await createTestUser(testModule!, {
      username: 'socket_user_3_owner',
      password: '123',
    })

    // User 2 has no access to the folder
    const {
      session: { accessToken: otherToken },
    } = await createTestUser(testModule!, {
      username: 'socket_user_3_other',
      password: '123',
    })

    const appIdentifier =
      await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
    await enableAppAsAdmin(appIdentifier)
    await enableAppForUser(otherToken, appIdentifier)

    const { folder } = await createTestFolder({
      accessToken: ownerToken,
      folderName: 'Private Folder',
      testModule,
      mockFiles: [],
      apiClient,
    })

    await enableAppForFolder(ownerToken, folder.id, appIdentifier)

    // Connect as the other user (who does NOT have folder access)
    const otherUserId = userIdFromToken(otherToken)
    const otherAppUserToken = await getAppUserToken(otherUserId, appIdentifier)
    socket = await connectAppUserSocket(otherAppUserToken)

    const errorData = await new Promise<{ folderId: string; error: string }>(
      (resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Expected subscribe_error but got none')),
          5000,
        )
        socket!.once('subscribe_error', (data) => {
          clearTimeout(timeout)
          resolve(data as { folderId: string; error: string })
        })
        socket!.emit('subscribe', {
          folderId: folder.id,
          appIdentifier,
        })
      },
    )

    expect(errorData.folderId).toBe(folder.id)
    expect(errorData.error).toBe('Access denied')
  })

  it('should reject folder subscribe when app is NOT enabled for folder', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'socket_user_4',
      password: '123',
    })

    const appIdentifier =
      await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
    await enableAppAsAdmin(appIdentifier)

    // Enable app for user but with folderScopeEnabledDefault=false
    await apiClient(accessToken).POST(
      `/api/v1/user/apps/{appIdentifier}/settings`,
      {
        params: { path: { appIdentifier } },
        body: {
          enabled: true,
          folderScopeEnabledDefault: false,
          folderScopePermissionsDefault: null,
          permissions: null,
        },
      },
    )

    const { folder } = await createTestFolder({
      accessToken,
      folderName: 'Folder No App',
      testModule,
      mockFiles: [],
      apiClient,
    })

    // Deliberately do NOT enable app for this folder

    const userId = userIdFromToken(accessToken)
    const appUserToken = await getAppUserToken(userId, appIdentifier)
    socket = await connectAppUserSocket(appUserToken)

    const errorData = await new Promise<{ folderId: string; error: string }>(
      (resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Expected subscribe_error but got none')),
          5000,
        )
        socket!.once('subscribe_error', (data) => {
          clearTimeout(timeout)
          resolve(data as { folderId: string; error: string })
        })
        socket!.emit('subscribe', {
          folderId: folder.id,
          appIdentifier,
        })
      },
    )

    expect(errorData.folderId).toBe(folder.id)
    expect(errorData.error).toBe('Access denied')
  })

  // --- Update routing tests ---

  it('should receive folder-scoped ASYNC_UPDATE after subscribing to folder', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'socket_user_5',
      password: '123',
    })

    const appIdentifier =
      await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
    await enableAppAsAdmin(appIdentifier)
    await enableAppForUser(accessToken, appIdentifier)

    const { folder } = await createTestFolder({
      accessToken,
      folderName: 'Update Folder',
      testModule,
      mockFiles: [],
      apiClient,
    })

    await enableAppForFolder(accessToken, folder.id, appIdentifier)

    const userId = userIdFromToken(accessToken)
    const appUserToken = await getAppUserToken(userId, appIdentifier)
    socket = await connectAppUserSocket(appUserToken)

    // Subscribe to folder
    await new Promise<void>((resolve) => {
      socket!.emit('subscribe', { folderId: folder.id, appIdentifier })
      setTimeout(resolve, 500)
    })

    const appUserSocketService =
      await testModule!.resolveDep(AppUserSocketService)

    const testUpdate = {
      type: 'progress' as const,
      data: { percent: 75 },
      timestamp: new Date().toISOString(),
    }

    const received = await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Expected ASYNC_UPDATE but got none')),
        5000,
      )
      socket!.once('ASYNC_UPDATE', (data) => {
        clearTimeout(timeout)
        resolve(data)
      })
      appUserSocketService.emitAsyncUpdate(
        {
          correlationKey: 'ck-folder-1',
          source: 'test',
          taskIdentifier: 'testtask',
          targetLocationObjectKey: null,
          targetUserId: null,
          targetLocationFolderId: folder.id,
        },
        testUpdate as never,
      )
    })

    expect(received).toBeDefined()
    expect((received as { correlationKey: string }).correlationKey).toBe(
      'ck-folder-1',
    )
    expect((received as { type: string }).type).toBe('progress')
  })

  it('should NOT receive folder-scoped ASYNC_UPDATE after unsubscribing from folder', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'socket_user_6',
      password: '123',
    })

    const appIdentifier =
      await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
    await enableAppAsAdmin(appIdentifier)
    await enableAppForUser(accessToken, appIdentifier)

    const { folder } = await createTestFolder({
      accessToken,
      folderName: 'Unsub Folder',
      testModule,
      mockFiles: [],
      apiClient,
    })

    await enableAppForFolder(accessToken, folder.id, appIdentifier)

    const userId = userIdFromToken(accessToken)
    const appUserToken = await getAppUserToken(userId, appIdentifier)
    socket = await connectAppUserSocket(appUserToken)

    // Subscribe then unsubscribe
    await new Promise<void>((resolve) => {
      socket!.emit('subscribe', { folderId: folder.id, appIdentifier })
      setTimeout(resolve, 500)
    })

    await new Promise<void>((resolve) => {
      socket!.emit('unsubscribe', { folderId: folder.id })
      setTimeout(resolve, 500)
    })

    const appUserSocketService =
      await testModule!.resolveDep(AppUserSocketService)

    const testUpdate = {
      type: 'progress' as const,
      data: { percent: 100 },
      timestamp: new Date().toISOString(),
    }

    const received = await new Promise<boolean>((resolve) => {
      socket!.once('ASYNC_UPDATE', () => resolve(true))
      appUserSocketService.emitAsyncUpdate(
        {
          correlationKey: 'ck-unsub-1',
          source: 'test',
          taskIdentifier: 'testtask',
          targetLocationObjectKey: null,
          targetUserId: null,
          targetLocationFolderId: folder.id,
        },
        testUpdate as never,
      )
      // If no event after 1.5s, we're good
      setTimeout(() => resolve(false), 1500)
    })

    expect(received).toBe(false)
  })

  it('should NOT receive user-scoped ASYNC_UPDATE targeted at a different user', async () => {
    const {
      session: { accessToken: token1 },
    } = await createTestUser(testModule!, {
      username: 'socket_user_7a',
      password: '123',
    })

    const {
      session: { accessToken: token2 },
    } = await createTestUser(testModule!, {
      username: 'socket_user_7b',
      password: '123',
    })

    const appIdentifier =
      await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
    await enableAppAsAdmin(appIdentifier)
    await enableAppForUser(token1, appIdentifier)

    const userId1 = userIdFromToken(token1)
    const appUserToken1 = await getAppUserToken(userId1, appIdentifier)
    const otherUserId = userIdFromToken(token2)

    // Connect as user 1 — should NOT receive updates targeted at user 2
    socket = await connectAppUserSocket(appUserToken1)

    const appUserSocketService =
      await testModule!.resolveDep(AppUserSocketService)

    const testUpdate = {
      type: 'progress' as const,
      data: { percent: 42 },
      timestamp: new Date().toISOString(),
    }

    const received = await new Promise<boolean>((resolve) => {
      socket!.once('ASYNC_UPDATE', () => resolve(true))
      appUserSocketService.emitAsyncUpdate(
        {
          correlationKey: 'ck-other-user',
          source: 'test',
          taskIdentifier: 'testtask',
          targetLocationObjectKey: null,
          targetUserId: otherUserId,
          targetLocationFolderId: null,
        },
        testUpdate as never,
      )
      setTimeout(() => resolve(false), 1500)
    })

    expect(received).toBe(false)
  })

  it('should reject connection with a regular (non-app-user) JWT', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'socket_user_8',
      password: '123',
    })

    // A regular user access token has sub "user:<id>", not "app_user:<id>:<app>"
    // The gateway should reject it
    const socketUrl = `${serverBaseUrl}/app-user`

    const result = await new Promise<'disconnected' | 'connected'>(
      (resolve) => {
        const regularSocket = io(socketUrl, {
          auth: { token: accessToken },
          reconnection: false,
          transports: ['websocket'],
        })

        const timeout = setTimeout(() => {
          regularSocket.disconnect()
          resolve('disconnected')
        }, 5000)

        regularSocket.on('connect', () => {
          clearTimeout(timeout)
          regularSocket.disconnect()
          resolve('connected')
        })

        regularSocket.on('disconnect', () => {
          clearTimeout(timeout)
          regularSocket.disconnect()
          resolve('disconnected')
        })
      },
    )

    expect(result).toBe('disconnected')
  })

  it('should deduplicate when update targets both user and folder the socket belongs to', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'socket_user_9',
      password: '123',
    })

    const appIdentifier =
      await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
    await enableAppAsAdmin(appIdentifier)
    await enableAppForUser(accessToken, appIdentifier)

    const { folder } = await createTestFolder({
      accessToken,
      folderName: 'Dedup Folder',
      testModule,
      mockFiles: [],
      apiClient,
    })

    await enableAppForFolder(accessToken, folder.id, appIdentifier)

    const userId = userIdFromToken(accessToken)
    const appUserToken = await getAppUserToken(userId, appIdentifier)
    socket = await connectAppUserSocket(appUserToken)

    // Subscribe to folder — socket is now in both user:<id> and folder:<id> rooms
    await new Promise<void>((resolve) => {
      socket!.emit('subscribe', { folderId: folder.id, appIdentifier })
      setTimeout(resolve, 500)
    })

    const appUserSocketService =
      await testModule!.resolveDep(AppUserSocketService)

    const testUpdate = {
      type: 'progress' as const,
      data: { percent: 99 },
      timestamp: new Date().toISOString(),
    }

    // Emit targeting BOTH user and folder — socket.io should deduplicate
    const messages: unknown[] = []
    const received = await new Promise<unknown[]>((resolve) => {
      socket!.on('ASYNC_UPDATE', (data) => {
        messages.push(data)
      })
      appUserSocketService.emitAsyncUpdate(
        {
          correlationKey: 'ck-dedup',
          source: 'test',
          taskIdentifier: 'testtask',
          targetLocationObjectKey: null,
          targetUserId: userId,
          targetLocationFolderId: folder.id,
        },
        testUpdate as never,
      )
      // Wait long enough to catch any duplicates
      setTimeout(() => resolve(messages), 2000)
    })

    expect(received).toHaveLength(1)
    expect((received[0] as { correlationKey: string }).correlationKey).toBe(
      'ck-dedup',
    )
  })

  it('should receive updates for multiple subscribed folders independently', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'socket_user_10',
      password: '123',
    })

    const appIdentifier =
      await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
    await enableAppAsAdmin(appIdentifier)
    await enableAppForUser(accessToken, appIdentifier)

    const { folder: folderA } = await createTestFolder({
      accessToken,
      folderName: 'Multi Folder A',
      testModule,
      mockFiles: [],
      apiClient,
    })

    const { folder: folderB } = await createTestFolder({
      accessToken,
      folderName: 'Multi Folder B',
      testModule,
      mockFiles: [],
      apiClient,
    })

    await enableAppForFolder(accessToken, folderA.id, appIdentifier)
    await enableAppForFolder(accessToken, folderB.id, appIdentifier)

    const userId = userIdFromToken(accessToken)
    const appUserToken = await getAppUserToken(userId, appIdentifier)
    socket = await connectAppUserSocket(appUserToken)

    // Subscribe to both folders
    await new Promise<void>((resolve) => {
      socket!.emit('subscribe', { folderId: folderA.id, appIdentifier })
      socket!.emit('subscribe', { folderId: folderB.id, appIdentifier })
      setTimeout(resolve, 500)
    })

    const appUserSocketService =
      await testModule!.resolveDep(AppUserSocketService)

    // Send update to folder A
    const receivedA = await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Expected ASYNC_UPDATE for folder A')),
        5000,
      )
      socket!.once('ASYNC_UPDATE', (data) => {
        clearTimeout(timeout)
        resolve(data)
      })
      appUserSocketService.emitAsyncUpdate(
        {
          correlationKey: 'ck-multi-a',
          source: 'test',
          taskIdentifier: 'testtask',
          targetLocationObjectKey: null,
          targetUserId: null,
          targetLocationFolderId: folderA.id,
        },
        {
          type: 'progress',
          data: { folder: 'A' },
          timestamp: new Date().toISOString(),
        } as never,
      )
    })

    expect((receivedA as { correlationKey: string }).correlationKey).toBe(
      'ck-multi-a',
    )

    // Send update to folder B
    const receivedB = await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Expected ASYNC_UPDATE for folder B')),
        5000,
      )
      socket!.once('ASYNC_UPDATE', (data) => {
        clearTimeout(timeout)
        resolve(data)
      })
      appUserSocketService.emitAsyncUpdate(
        {
          correlationKey: 'ck-multi-b',
          source: 'test',
          taskIdentifier: 'testtask',
          targetLocationObjectKey: null,
          targetUserId: null,
          targetLocationFolderId: folderB.id,
        },
        {
          type: 'progress',
          data: { folder: 'B' },
          timestamp: new Date().toISOString(),
        } as never,
      )
    })

    expect((receivedB as { correlationKey: string }).correlationKey).toBe(
      'ck-multi-b',
    )
  })

  it('should only deliver folder update to the subscribed user, not another user with access', async () => {
    const {
      session: { accessToken: token1 },
    } = await createTestUser(testModule!, {
      username: 'socket_user_11a',
      password: '123',
    })

    const {
      session: { accessToken: token2 },
    } = await createTestUser(testModule!, {
      username: 'socket_user_11b',
      password: '123',
    })

    const appIdentifier =
      await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
    await enableAppAsAdmin(appIdentifier)
    await enableAppForUser(token1, appIdentifier)
    await enableAppForUser(token2, appIdentifier)

    const { folder } = await createTestFolder({
      accessToken: token1,
      folderName: 'Selective Folder',
      testModule,
      mockFiles: [],
      apiClient,
    })

    await enableAppForFolder(token1, folder.id, appIdentifier)

    const userId1 = userIdFromToken(token1)
    const userId2 = userIdFromToken(token2)
    const appUserToken1 = await getAppUserToken(userId1, appIdentifier)
    const appUserToken2 = await getAppUserToken(userId2, appIdentifier)

    // Both users connect
    socket = await connectAppUserSocket(appUserToken1)
    const socket2 = await connectAppUserSocket(appUserToken2)

    try {
      // Only user 1 subscribes to the folder
      await new Promise<void>((resolve) => {
        socket!.emit('subscribe', { folderId: folder.id, appIdentifier })
        setTimeout(resolve, 500)
      })

      const appUserSocketService =
        await testModule!.resolveDep(AppUserSocketService)

      const testUpdate = {
        type: 'progress' as const,
        data: { percent: 60 },
        timestamp: new Date().toISOString(),
      }

      // Track what each socket receives
      let socket1Got = false
      let socket2Got = false

      await new Promise<void>((resolve) => {
        socket!.once('ASYNC_UPDATE', () => {
          socket1Got = true
        })
        socket2.once('ASYNC_UPDATE', () => {
          socket2Got = true
        })
        appUserSocketService.emitAsyncUpdate(
          {
            correlationKey: 'ck-selective',
            source: 'test',
            taskIdentifier: 'testtask',
            targetLocationObjectKey: null,
            targetUserId: null,
            targetLocationFolderId: folder.id,
          },
          testUpdate as never,
        )
        setTimeout(resolve, 2000)
      })

      expect(socket1Got).toBe(true)
      expect(socket2Got).toBe(false)
    } finally {
      socket2.disconnect()
    }
  })

  it('should still receive updates for folder A after unsubscribing from folder B', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'socket_user_12',
      password: '123',
    })

    const appIdentifier =
      await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
    await enableAppAsAdmin(appIdentifier)
    await enableAppForUser(accessToken, appIdentifier)

    const { folder: folderA } = await createTestFolder({
      accessToken,
      folderName: 'Keep Folder A',
      testModule,
      mockFiles: [],
      apiClient,
    })

    const { folder: folderB } = await createTestFolder({
      accessToken,
      folderName: 'Drop Folder B',
      testModule,
      mockFiles: [],
      apiClient,
    })

    await enableAppForFolder(accessToken, folderA.id, appIdentifier)
    await enableAppForFolder(accessToken, folderB.id, appIdentifier)

    const userId = userIdFromToken(accessToken)
    const appUserToken = await getAppUserToken(userId, appIdentifier)
    socket = await connectAppUserSocket(appUserToken)

    // Subscribe to both, then unsubscribe from B
    await new Promise<void>((resolve) => {
      socket!.emit('subscribe', { folderId: folderA.id, appIdentifier })
      socket!.emit('subscribe', { folderId: folderB.id, appIdentifier })
      setTimeout(resolve, 500)
    })

    await new Promise<void>((resolve) => {
      socket!.emit('unsubscribe', { folderId: folderB.id })
      setTimeout(resolve, 500)
    })

    const appUserSocketService =
      await testModule!.resolveDep(AppUserSocketService)

    // Folder A update should still arrive
    const receivedA = await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Expected ASYNC_UPDATE for folder A')),
        5000,
      )
      socket!.once('ASYNC_UPDATE', (data) => {
        clearTimeout(timeout)
        resolve(data)
      })
      appUserSocketService.emitAsyncUpdate(
        {
          correlationKey: 'ck-keep-a',
          targetUserId: null,
          source: 'test',
          taskIdentifier: 'testtask',
          targetLocationObjectKey: null,
          targetLocationFolderId: folderA.id,
        },
        {
          type: 'progress',
          data: { kept: true },
          timestamp: new Date().toISOString(),
        } as never,
      )
    })

    expect((receivedA as { correlationKey: string }).correlationKey).toBe(
      'ck-keep-a',
    )

    // Folder B update should NOT arrive
    const receivedB = await new Promise<boolean>((resolve) => {
      socket!.once('ASYNC_UPDATE', () => resolve(true))
      appUserSocketService.emitAsyncUpdate(
        {
          correlationKey: 'ck-drop-b',
          targetUserId: null,
          source: 'test',
          taskIdentifier: 'testtask',
          targetLocationObjectKey: null,
          targetLocationFolderId: folderB.id,
        },
        {
          type: 'progress',
          data: { dropped: true },
          timestamp: new Date().toISOString(),
        } as never,
      )
      setTimeout(() => resolve(false), 1500)
    })

    expect(receivedB).toBe(false)
  })
})
