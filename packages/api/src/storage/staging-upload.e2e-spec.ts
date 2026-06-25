import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test'
import sharp from 'sharp'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestUser,
  testS3Location,
} from 'src/test/test.util'

const TEST_MODULE_KEY = 'staging_upload'

// A valid >=250px webp the icon pipeline will accept.
function makeIcon(): Promise<Buffer> {
  return sharp({
    create: {
      width: 256,
      height: 256,
      channels: 3,
      background: { r: 10, g: 120, b: 200 },
    },
  })
    .webp()
    .toBuffer()
}

// A valid webp that's too small (< 250px): passes the size/mime gates but fails
// image validation inside the consume, so the create transaction must roll back.
function makeTinyIcon(): Promise<Buffer> {
  return sharp({
    create: {
      width: 10,
      height: 10,
      channels: 3,
      background: { r: 10, g: 120, b: 200 },
    },
  })
    .webp()
    .toBuffer()
}

async function makeFolderBody(testModule: TestModule, iconStagingKey?: string) {
  const contentBucket = await testModule.initMinioTestBucket()
  const metadataBucket = await testModule.initMinioTestBucket()
  return {
    name: `staging-folder-${Date.now()}`,
    contentLocation: testS3Location({ bucketName: contentBucket }),
    metadataLocation: testS3Location({ bucketName: metadataBucket }),
    ...(iconStagingKey ? { iconStagingKey } : {}),
  }
}

describe('Staging uploads', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
    apiClient = testModule.apiClient
  })

  // resetAppState() (afterEach) clears the server storage config, so re-apply it
  // before each test.
  beforeEach(async () => {})

  afterEach(async () => {
    await testModule?.resetAppState()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  // Mint a staging upload for `purpose` and PUT `bytes` to it; returns the key.
  async function stage(
    accessToken: string,
    purpose: 'folder-icon' | 'user-avatar' | 'server-icon',
    bytes: Buffer,
  ): Promise<string> {
    const mint = await apiClient(accessToken).POST('/api/v1/staging-uploads', {
      body: { purpose },
    })
    const { stagingKey, uploadUrl } = mint.data!
    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/webp' },
      body: new Blob([new Uint8Array(bytes)], { type: 'image/webp' }),
    })
    expect(put.ok).toBeTrue()
    return stagingKey
  }

  it('mints a presigned staging upload for a purpose', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, { username: 'stg1', password: '123' })

    const res = await apiClient(accessToken).POST('/api/v1/staging-uploads', {
      body: { purpose: 'folder-icon' },
    })
    expect(res.response.status).toEqual(201)
    expect(res.data?.stagingKey).toBeString()
    // Path-style URL: /{uploadsBucket}/{tier}/... — the uploads bucket is
    // namespaced per-suite in tests (uploads-<suffix>), so match the tier segment
    // after any `uploads*` bucket name rather than a literal `/uploads/1/`.
    expect(res.data?.uploadUrl).toMatch(/\/uploads[\w-]*\/1\//)
  })

  it('stages an icon and applies it on folder create', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, { username: 'stg2', password: '123' })

    const mint = await apiClient(accessToken).POST('/api/v1/staging-uploads', {
      body: { purpose: 'folder-icon' },
    })
    const { stagingKey, uploadUrl } = mint.data!

    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/webp' },
      body: new Blob([new Uint8Array(await makeIcon())], {
        type: 'image/webp',
      }),
    })
    expect(put.ok).toBeTrue()

    const create = await apiClient(accessToken).POST('/api/v1/folders', {
      body: await makeFolderBody(testModule!, stagingKey),
    })
    expect(create.response.status).toEqual(201)
    const folderId = create.data!.folder.id

    // The icon is applied after the folder row is created, so re-fetch: a
    // populated `icon` proves the staged upload was consumed and stored.
    const folder = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}',
      { params: { path: { folderId } } },
    )
    expect(folder.data?.folder.icon).toBeDefined()
  })

  it('rejects a folder create referencing an unknown staging key (atomic: no folder created)', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, { username: 'stg3', password: '123' })

    const before = await apiClient(accessToken).GET('/api/v1/folders', {})
    const beforeCount = before.data?.meta.totalCount ?? 0

    const create = await apiClient(accessToken).POST('/api/v1/folders', {
      body: await makeFolderBody(
        testModule!,
        '00000000-0000-4000-8000-000000000000',
      ),
    })
    expect(create.response.status).toEqual(400)

    const after = await apiClient(accessToken).GET('/api/v1/folders', {})
    expect(after.data?.meta.totalCount ?? 0).toEqual(beforeCount)
  })

  it('rejects an oversized staged upload at consume', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, { username: 'stg4', password: '123' })

    const mint = await apiClient(accessToken).POST('/api/v1/staging-uploads', {
      body: { purpose: 'folder-icon' },
    })
    const { stagingKey, uploadUrl } = mint.data!

    // > 1 MB icon-tier limit (bypasses nginx in tests; consume must reject).
    const tooBig = new Uint8Array(1024 * 1024 + 1)
    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/webp' },
      body: new Blob([tooBig], { type: 'image/webp' }),
    })
    expect(put.ok).toBeTrue()

    const create = await apiClient(accessToken).POST('/api/v1/folders', {
      body: await makeFolderBody(testModule!, stagingKey),
    })
    expect(create.response.status).toEqual(400)
  })

  it("rejects consuming another user's staged upload", async () => {
    const a = await createTestUser(testModule!, {
      username: 'stgXA',
      password: '123',
    })
    const b = await createTestUser(testModule!, {
      username: 'stgXB',
      password: '123',
    })
    // A stages a key; the object lives under A's user id.
    const stagingKey = await stage(
      a.session.accessToken,
      'folder-icon',
      await makeIcon(),
    )

    const before = await apiClient(b.session.accessToken).GET(
      '/api/v1/folders',
      {},
    )
    const beforeCount = before.data?.meta.totalCount ?? 0

    // B references A's key — B's consume looks under B's user id, finds nothing.
    const create = await apiClient(b.session.accessToken).POST(
      '/api/v1/folders',
      { body: await makeFolderBody(testModule!, stagingKey) },
    )
    expect(create.response.status).toEqual(400)

    const after = await apiClient(b.session.accessToken).GET(
      '/api/v1/folders',
      {},
    )
    expect(after.data?.meta.totalCount ?? 0).toEqual(beforeCount)
  })

  it('deletes the staged object after a successful consume (single-use)', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'stgSingle',
      password: '123',
    })
    const stagingKey = await stage(accessToken, 'folder-icon', await makeIcon())

    const first = await apiClient(accessToken).POST('/api/v1/folders', {
      body: await makeFolderBody(testModule!, stagingKey),
    })
    expect(first.response.status).toEqual(201)

    // The object was removed on first success, so reusing the key fails.
    const second = await apiClient(accessToken).POST('/api/v1/folders', {
      body: await makeFolderBody(testModule!, stagingKey),
    })
    expect(second.response.status).toEqual(400)
    expect(second.error?.message).toContain('not found')
  })

  it('rolls back the folder and keeps staged bytes when the icon step fails', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'stgRollback',
      password: '123',
    })
    // Too-small webp: passes the size gate, fails image validation inside the
    // create transaction — the folder row must roll back.
    const stagingKey = await stage(
      accessToken,
      'folder-icon',
      await makeTinyIcon(),
    )

    const before = await apiClient(accessToken).GET('/api/v1/folders', {})
    const beforeCount = before.data?.meta.totalCount ?? 0

    const create = await apiClient(accessToken).POST('/api/v1/folders', {
      body: await makeFolderBody(testModule!, stagingKey),
    })
    expect(create.response.status).toEqual(400)

    const after = await apiClient(accessToken).GET('/api/v1/folders', {})
    expect(after.data?.meta.totalCount ?? 0).toEqual(beforeCount)

    // The staged object is deleted only after a successful commit, so a retry
    // reaches image validation again rather than failing as "not found".
    const retry = await apiClient(accessToken).POST('/api/v1/folders', {
      body: await makeFolderBody(testModule!, stagingKey),
    })
    expect(retry.response.status).toEqual(400)
    expect(retry.error?.message).not.toContain('not found')
  })

  it('stages and applies a user avatar via the viewer endpoint', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'stgAvatar',
      password: '123',
    })
    const stagingKey = await stage(accessToken, 'user-avatar', await makeIcon())

    const res = await apiClient(accessToken).POST('/api/v1/viewer/avatar', {
      body: { stagingKey },
    })
    expect(res.response.status).toEqual(201)
    expect(res.data?.user.avatar).toBeDefined()
  })

  it('stages and applies the server icon (admin)', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'stgServerIcon',
      password: '123',
      admin: true,
    })
    const stagingKey = await stage(accessToken, 'server-icon', await makeIcon())

    const res = await apiClient(accessToken).POST('/api/v1/server/icon', {
      body: { stagingKey },
    })
    expect(res.response.status).toEqual(201)
  })
})
