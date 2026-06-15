import { SignedURLsRequestMethod } from '@lombokapp/types'
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
import type { TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'
import { usersTable } from 'src/users/entities/user.entity'

import { buildAppClient } from '../../../../app-worker-sdk'

const TEST_MODULE_KEY = 'app_storage'
const SOCKET_TEST_APP_SLUG = 'sockettestapp'

describe('App Storage Partitions', () => {
  let testModule: TestModule | undefined
  const _logger = new Logger(`TestModule[${TEST_MODULE_KEY}]`)
  let socket: Socket | undefined
  let serverBaseUrl: string
  let appIdentifier: string
  const startServerOnPort = 7041

  const createAppToken = (identifier: string): Promise<string> =>
    testModule!.services.jwtService.mintAppToken(identifier)

  const connectSocket = async (instanceId: string): Promise<Socket> => {
    const token = await createAppToken(appIdentifier)
    const socketUrl = `${serverBaseUrl}/apps`
    return new Promise((resolve, reject) => {
      const newSocket = io(socketUrl, {
        auth: { instanceId, token, handledTaskIdentifiers: [] },
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

  /** Sign one or more app-storage URLs over the socket, asserting success. */
  const signAppStorageUrls = async (
    requests: {
      objectKey: string
      method: SignedURLsRequestMethod
      userId?: string
    }[],
  ): Promise<string[]> => {
    socket = await connectSocket('storage-instance')
    const response = await buildAppClient(
      socket,
      serverBaseUrl,
    ).getAppStorageSignedUrls(requests)
    if (!('result' in response)) {
      throw new Error(
        `Expected signed urls, got error: ${JSON.stringify(response)}`,
      )
    }
    return response.result
  }

  const createUserWithId = async (
    username: string,
  ): Promise<{ id: string; accessToken: string }> => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, { username, password: '123' })
    const user =
      await testModule!.services.ormService.db.query.usersTable.findFirst({
        where: eq(usersTable.username, username),
      })
    if (!user) {
      throw new Error(`Test user ${username} not found after creation`)
    }
    return { id: user.id, accessToken }
  }

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
      startServerOnPort,
    })
    await testModule.installLocalAppBundles([SOCKET_TEST_APP_SLUG])
    serverBaseUrl = `http://localhost:${startServerOnPort}`
    appIdentifier = testModule.getInstalledAppIdentifier(SOCKET_TEST_APP_SLUG)
  })

  beforeEach(async () => {
    await testModule!.installLocalAppBundles([SOCKET_TEST_APP_SLUG])
  })

  afterEach(async () => {
    if (socket) {
      socket.disconnect()
      socket = undefined
    }
    await testModule?.resetAppState()
  })

  afterAll(async () => {
    if (socket) {
      socket.disconnect()
    }
    await testModule?.shutdown()
  })

  // ─── Socket signing path ──────────────────────────────────────────────────

  it('signs URLs under the shared partition when no userId is given', async () => {
    const [url] = await signAppStorageUrls([
      { objectKey: 'reports/a.txt', method: SignedURLsRequestMethod.PUT },
    ])
    expect(url).toBeDefined()
    const pathname = new URL(url!).pathname
    expect(pathname).toContain(
      `app-runtime-storage/${appIdentifier}/shared/reports/a.txt`,
    )
    expect(pathname).not.toContain('/users/')
  })

  it('signs URLs under the user partition when a userId is given', async () => {
    const userId = '11111111-1111-4111-8111-111111111111'
    const [url] = await signAppStorageUrls([
      {
        objectKey: 'reports/a.txt',
        method: SignedURLsRequestMethod.PUT,
        userId,
      },
    ])
    expect(url).toBeDefined()
    const pathname = new URL(url!).pathname
    expect(pathname).toContain(
      `app-runtime-storage/${appIdentifier}/users/${userId}/reports/a.txt`,
    )
    expect(pathname).not.toContain('/shared/')
  })

  it('rejects a malformed userId', async () => {
    socket = await connectSocket('storage-instance')
    const response = await buildAppClient(
      socket,
      serverBaseUrl,
    ).getAppStorageSignedUrls([
      {
        objectKey: 'reports/a.txt',
        method: SignedURLsRequestMethod.PUT,
        // not a uuid — the schema should reject it
        userId: 'not-a-uuid',
      },
    ])
    expect('error' in response).toBe(true)
  })

  // ─── Full round-trip: app writes → user lists + downloads ────────────────────

  it('round-trips an object through a user partition: app PUTs, user lists and downloads', async () => {
    const userA = await createUserWithId('storageusera')
    const content = 'hello-from-user-a'

    // App writes into user A's partition via a signed PUT URL.
    const [putUrl] = await signAppStorageUrls([
      {
        objectKey: 'docs/note.txt',
        method: SignedURLsRequestMethod.PUT,
        userId: userA.id,
      },
    ])
    const putRes = await fetch(putUrl!, { method: 'PUT', body: content })
    expect(putRes.ok).toBe(true)

    // User A lists their own partition — the object appears with a relative key.
    const listed = await testModule!
      .apiClient(userA.accessToken)
      .GET('/api/v1/user/apps/{appIdentifier}/storage/objects', {
        params: { path: { appIdentifier } },
      })
    expect(listed.error).toBeUndefined()
    const keys = listed.data!.result.map((o) => o.key)
    expect(keys).toContain('docs/note.txt')

    // User A presigns a download and reads the bytes back.
    const presigned = await testModule!
      .apiClient(userA.accessToken)
      .POST('/api/v1/user/apps/{appIdentifier}/storage/presigned-urls', {
        params: { path: { appIdentifier } },
        body: {
          requests: [
            { objectKey: 'docs/note.txt', method: SignedURLsRequestMethod.GET },
          ],
        },
      })
    expect(presigned.error).toBeUndefined()
    const downloadUrl = presigned.data!.urls[0]
    const downloaded = await fetch(downloadUrl!)
    expect(downloaded.status).toBe(200)
    expect(await downloaded.text()).toBe(content)
  })

  it("never exposes another user's partition", async () => {
    const userA = await createUserWithId('isousera')
    const userB = await createUserWithId('isouserb')

    // Seed an object in user A's partition.
    const [putUrl] = await signAppStorageUrls([
      {
        objectKey: 'private/secret.txt',
        method: SignedURLsRequestMethod.PUT,
        userId: userA.id,
      },
    ])
    expect((await fetch(putUrl!, { method: 'PUT', body: 'a-only' })).ok).toBe(
      true,
    )

    // User B's listing of the same app is empty — they can't see A's object.
    const listedB = await testModule!
      .apiClient(userB.accessToken)
      .GET('/api/v1/user/apps/{appIdentifier}/storage/objects', {
        params: { path: { appIdentifier } },
      })
    expect(listedB.error).toBeUndefined()
    expect(listedB.data!.result.map((o) => o.key)).not.toContain(
      'private/secret.txt',
    )

    // Even presigning the same key as user B resolves to B's (empty) partition.
    const presignedB = await testModule!
      .apiClient(userB.accessToken)
      .POST('/api/v1/user/apps/{appIdentifier}/storage/presigned-urls', {
        params: { path: { appIdentifier } },
        body: {
          requests: [
            {
              objectKey: 'private/secret.txt',
              method: SignedURLsRequestMethod.GET,
            },
          ],
        },
      })
    expect(presignedB.error).toBeUndefined()
    const urlB = presignedB.data!.urls[0]
    expect((await fetch(urlB!)).status).toBe(404)
  })

  it('rejects write methods on the user storage presign endpoint', async () => {
    const userA = await createUserWithId('storagewriteuser')
    const presigned = await testModule!
      .apiClient(userA.accessToken)
      .POST('/api/v1/user/apps/{appIdentifier}/storage/presigned-urls', {
        params: { path: { appIdentifier } },
        body: {
          requests: [
            // PUT is not an allowed method for the user-facing endpoint.
            {
              objectKey: 'docs/note.txt',
              method: SignedURLsRequestMethod.PUT as never,
            },
          ],
        },
      })
    expect(presigned.error).toBeDefined()
  })
})
