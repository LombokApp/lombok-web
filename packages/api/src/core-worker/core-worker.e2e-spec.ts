import { SignedURLsRequestMethod } from '@lombokapp/types'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  spyOn,
} from 'bun:test'
import crypto from 'crypto'
import { and, eq } from 'drizzle-orm'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { AppService } from 'src/app/services/app.service'
import { folderObjectsTable } from 'src/folders/entities/folder-object.entity'
import { waitForTrue } from 'src/platform/utils/wait.util'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
  reindexTestFolder,
} from 'src/test/test.util'

const TEST_MODULE_KEY = 'core_worker'
const API_SERVER_PORT = 7001
const WORKER_IDENTIFIER = 'test_worker'
const WORKER_ENTRYPOINT = 'worker-entry.ts'
const CONTENT_OBJECT_KEY = 'sample.txt'

const WORKER_ENV_VARS = {
  TEST_FLAG: 'true',
}

const WORKER_SOURCE = `import type { RequestHandler, TaskHandler } from '@lombokapp/app-worker-sdk'

export const handleTask: TaskHandler = async function handleTask() {
  if (process.env.WORKER_ENV_TEST_FLAG !== 'true') {
    throw new Error('Missing worker env flag')
  }
}

export const handleRequest: RequestHandler = async function handleRequest(request, { actor }) {
  const bodyText = await request.text()
  return new Response(
    JSON.stringify({
      ok: true,
      method: request.method,
      url: request.url,
      actorType: actor?.actorType ?? 'none',
      body: bodyText,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
}
`

const UI_HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Core Worker UI</title>
  </head>
  <body>
    <main>Core Worker Test UI Bundle</main>
  </body>
</html>
`

const contentBuffer = Buffer.from('Hello from core worker e2e')
const expectedContentHash = crypto
  .createHash('sha1')
  .update(contentBuffer)
  .digest('hex')

describe('Core Worker', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient
  let getAppUIbundleSpy:
    | ReturnType<typeof spyOn<AppService, 'getAppUIbundle'>>
    | undefined
  let getWorkerExecConfigSpy:
    | ReturnType<typeof spyOn<AppService, 'getWorkerExecConfig'>>
    | undefined
  let createSignedContentUrlsSpy:
    | ReturnType<typeof spyOn<AppService, 'createSignedContentUrls'>>
    | undefined
  let createSignedMetadataUrlsSpy:
    | ReturnType<typeof spyOn<AppService, 'createSignedMetadataUrls'>>
    | undefined
  let tempDir = ''
  let appBundleZipPath = ''
  let appSlug = ''
  let installedAppIdentifier = ''
  let previousPlatformPort: string | undefined
  let previousPlatformHttps: string | undefined

  const resetTestState = async () => {
    await testModule?.resetAppState()
  }

  const resetTracking = () => {
    getAppUIbundleSpy?.mockClear()
    getWorkerExecConfigSpy?.mockClear()
    createSignedContentUrlsSpy?.mockClear()
    createSignedMetadataUrlsSpy?.mockClear()
  }

  const buildAppBundle = async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lombok-core-worker-e2e-'))
    const appRoot = path.join(tempDir, 'app')
    const uiDir = path.join(appRoot, 'ui')
    const workerDir = path.join(appRoot, 'workers')
    fs.mkdirSync(uiDir, { recursive: true })
    fs.mkdirSync(workerDir, { recursive: true })

    fs.writeFileSync(path.join(uiDir, 'index.html'), UI_HTML)
    fs.writeFileSync(path.join(workerDir, WORKER_ENTRYPOINT), WORKER_SOURCE)

    const config = {
      slug: appSlug,
      label: 'Core Worker Test App',
      description: 'Core worker e2e app',
      requiresStorage: true,
      subscribedPlatformEvents: [],
      permissions: {
        platform: [],
        user: [],
        folder: [],
      },
      ui: {
        enabled: true,
        csp: '',
      },
      workers: {
        [WORKER_IDENTIFIER]: {
          description: 'Test worker',
          entrypoint: WORKER_ENTRYPOINT,
          environmentVariables: WORKER_ENV_VARS,
        },
      },
      tasks: [
        {
          identifier: 'test_task',
          label: 'Test Task',
          description: 'Test task for core worker',
          handler: {
            type: 'worker',
            identifier: WORKER_IDENTIFIER,
          },
        },
      ],
    }
    fs.writeFileSync(
      path.join(appRoot, 'config.json'),
      JSON.stringify(config, null, 2),
    )

    appBundleZipPath = path.join(tempDir, `${appSlug}.zip`)
    const zipProc = Bun.spawn({
      cmd: ['zip', '-r', appBundleZipPath, './'],
      cwd: appRoot,
      stdout: 'inherit',
      stderr: 'inherit',
    })
    const zipCode = await zipProc.exited
    if (zipCode !== 0) {
      throw new Error(`Failed to create app zip at ${appBundleZipPath}`)
    }
  }

  const installTestApp = async () => {
    if (!testModule) {
      throw new Error('Test module not initialized')
    }

    await testModule.setServerStorageLocation()
    const zipFileBuffer = fs.readFileSync(appBundleZipPath)
    const installedApp = await testModule.services.appService.handleAppInstall({
      zipFilename: `${appSlug}.zip`,
      zipFileBuffer,
    })
    installedAppIdentifier = installedApp.identifier
    await testModule.services.coreWorkerService.updateAppInstallIdMapping()
  }

  const buildTask = () => {
    const nowIso = new Date().toISOString()
    return {
      id: crypto.randomUUID(),
      taskIdentifier: 'test_task',
      ownerIdentifier: installedAppIdentifier,
      trigger: {
        kind: 'app_action' as const,
        invokeContext: {
          requestId: crypto.randomUUID(),
        },
      },
      taskDescription: 'Test task for core worker',
      systemLog: [],
      taskLog: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    }
  }

  beforeAll(async () => {
    previousPlatformPort = process.env.PLATFORM_PORT
    previousPlatformHttps = process.env.PLATFORM_HTTPS
    process.env.PLATFORM_PORT = API_SERVER_PORT.toString()
    process.env.PLATFORM_HTTPS = 'false'

    appSlug = `coreworkertest${Date.now()}`
    await buildAppBundle()

    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
      startCoreWorker: true,
      // debug: true,
      startServerOnPort: API_SERVER_PORT,
    })
    apiClient = testModule.apiClient

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalGetAppUIbundle = AppService.prototype.getAppUIbundle
    getAppUIbundleSpy = spyOn(
      AppService.prototype,
      'getAppUIbundle',
    ).mockImplementation(async function (this: AppService, ...args) {
      // Call the original implementation with the correct 'this' context
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const uiBundleResult = await originalGetAppUIbundle.call(this, ...args)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return uiBundleResult
    })

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalGetWorkerExecConfig = AppService.prototype.getWorkerExecConfig
    getWorkerExecConfigSpy = spyOn(
      AppService.prototype,
      'getWorkerExecConfig',
    ).mockImplementation(async function (this: AppService, ...args) {
      // Call the original implementation with the correct 'this' context
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const getWorkerExecConfigResult = await originalGetWorkerExecConfig.call(
        this,
        ...args,
      )
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return getWorkerExecConfigResult
    })

    const originalCreateContentSignedUrls =
      // eslint-disable-next-line @typescript-eslint/unbound-method
      AppService.prototype.createSignedContentUrls
    createSignedContentUrlsSpy = spyOn(
      AppService.prototype,
      'createSignedContentUrls',
    ).mockImplementation(async function (this: AppService, ...args) {
      // Call the original implementation with the correct 'this' context
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const createContentSignedUrlsResult =
        await originalCreateContentSignedUrls.call(this, ...args)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return createContentSignedUrlsResult
    })

    const originalCreateMetadataSignedUrls =
      // eslint-disable-next-line @typescript-eslint/unbound-method
      AppService.prototype.createSignedMetadataUrls
    createSignedMetadataUrlsSpy = spyOn(
      AppService.prototype,
      'createSignedMetadataUrls',
    ).mockImplementation(async function (this: AppService, ...args) {
      // Call the original implementation with the correct 'this' context
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const createMetadataSignedUrlsResult =
        await originalCreateMetadataSignedUrls.call(this, ...args)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return createMetadataSignedUrlsResult
    })

    await waitForTrue(() => testModule!.services.coreWorkerService.isReady(), {
      retryPeriodMs: 250,
      maxRetries: 6,
      totalMaxDurationMs: 10000,
    })

    // const originalGetMetadataSignedUrls =
    //   AppService.prototype.getMetadataSignedUrls
    // await waitForTrue(() => testModule!.services.coreWorkerService.isReady(), {
    //   retryPeriodMs: 250,
    //   maxRetries: 6,
    //   totalMaxDurationMs: 10000,
    // })
  })

  beforeEach(async () => {
    resetTracking()
    await installTestApp()
  })

  afterEach(async () => {
    await resetTestState()
  })

  afterAll(async () => {
    getAppUIbundleSpy?.mockReset()

    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }

    if (typeof previousPlatformPort === 'string') {
      process.env.PLATFORM_PORT = previousPlatformPort
    } else {
      delete process.env.PLATFORM_PORT
    }

    if (typeof previousPlatformHttps === 'string') {
      process.env.PLATFORM_HTTPS = previousPlatformHttps
    } else {
      delete process.env.PLATFORM_HTTPS
    }

    await testModule?.shutdown()
  })

  it('should report ready', async () => {
    await waitForTrue(() => testModule!.services.coreWorkerService.isReady(), {
      retryPeriodMs: 250,
      maxRetries: 4,
      totalMaxDurationMs: 5000,
    })
  })

  it('should accept app install id mapping updates', () => {
    expect(
      testModule!.services.coreWorkerService.updateAppInstallIdMapping(),
    ).resolves.toBeUndefined()
  })

  it('should serve UI bundle via core worker server', async () => {
    const response = await fetch('http://127.0.0.1:3001/', {
      headers: {
        host: `${installedAppIdentifier}.apps.localhost`,
      },
    })
    const bodyText = await response.text()
    expect(response.status).toBe(200)
    expect(bodyText).toContain('Core Worker Test UI Bundle')
    expect(getAppUIbundleSpy?.mock.calls.length).toBe(1)
    expect(getAppUIbundleSpy?.mock.calls[0]?.[0]).toBe(installedAppIdentifier)
  })

  it('should execute tasks and request worker exec config', async () => {
    const response =
      await testModule!.services.coreWorkerService.executeServerlessTask({
        task: buildTask(),
        appIdentifier: installedAppIdentifier,
        workerIdentifier: WORKER_IDENTIFIER,
      })

    expect(response.success).toBe(true)
    if (response.success) {
      expect(response.result).toBeNull()
      expect(getWorkerExecConfigSpy?.mock.calls.length).toBe(1)
    }
    expect(getWorkerExecConfigSpy?.mock.calls[0]?.[0]).toEqual({
      appIdentifier: installedAppIdentifier,
      workerIdentifier: WORKER_IDENTIFIER,
    })
  })

  it('should execute system requests and return worker response', async () => {
    const response =
      await testModule!.services.coreWorkerService.executeServerlessRequest({
        appIdentifier: installedAppIdentifier,
        workerIdentifier: WORKER_IDENTIFIER,
        request: {
          url: `http://__SYSTEM__/worker-api/${WORKER_IDENTIFIER}/echo`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ping: 'pong' }),
        },
      })

    expect(response.success).toBe(true)
    if (response.success) {
      expect(response.result.status).toBe(200)
      const parsedBody = JSON.parse(response.result.body ?? '{}') as {
        ok?: boolean
        body?: string
        actorType?: string
      }
      expect(parsedBody.ok).toBe(true)
      expect(parsedBody.body).toContain('pong')
      expect(parsedBody.actorType).toBe('system')
      expect(getWorkerExecConfigSpy?.mock.calls.length).toBe(1)
    }
  })

  it('should analyze objects and request signed urls', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: `coreworker_user_${Date.now()}`,
      password: '123',
    })

    const { folder } = await createTestFolder({
      accessToken,
      folderName: 'Core Worker Folder',
      testModule,
      mockFiles: [
        {
          objectKey: CONTENT_OBJECT_KEY,
          content: contentBuffer.toString('utf-8'),
        },
      ],
      apiClient,
    })

    await reindexTestFolder({
      accessToken,
      folderId: folder.id,
      apiClient,
    })

    await testModule!.services.platformTaskService.drainPlatformTasks(true)

    const folderObject =
      await testModule!.services.ormService.db.query.folderObjectsTable.findFirst(
        {
          where: and(
            eq(folderObjectsTable.folderId, folder.id),
            eq(folderObjectsTable.objectKey, CONTENT_OBJECT_KEY),
          ),
        },
      )

    expect(folderObject?.hash).toBe(expectedContentHash)
    expect(folderObject?.mimeType).toBeDefined()
    expect(folderObject?.mediaType).toBeDefined()
    expect(createSignedContentUrlsSpy?.mock.calls.length).toBe(1)
    expect(createSignedContentUrlsSpy?.mock.calls[0]?.[0]?.[0]).toEqual({
      folderId: folder.id,
      objectKey: CONTENT_OBJECT_KEY,
      method: SignedURLsRequestMethod.GET,
    })
    expect(createSignedMetadataUrlsSpy?.mock.calls.length).toBe(1)
    expect(createSignedMetadataUrlsSpy?.mock.calls[0]?.[0]?.length).toEqual(0)
  })
})
