import {
  CORE_IDENTIFIER,
  type JsonSerializableObject,
  SignedURLsRequestMethod,
} from '@lombokapp/types'
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
import { and, asc, eq } from 'drizzle-orm'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { AppService } from 'src/app/services/app.service'
import { waitForTrue } from 'src/core/utils/wait.util'
import { folderObjectsTable } from 'src/folders/entities/folder-object.entity'
import { runWithThreadContext } from 'src/shared/thread-context'
import { tasksTable } from 'src/task/entities/task.entity'
import { CoreTaskName } from 'src/task/task.constants'
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
const EXECUTION_ERROR_WORKER_IDENTIFIER = 'test_worker_exec_error'
const WORKER_ENTRYPOINT = 'worker-entry.ts'
const SCRIPT_ERROR_TASK_IDENTIFIER = 'script_error_task'
const UNEXPECTED_SCRIPT_ERROR_TASK_IDENTIFIER = 'unexpected_script_error_task'
const THROWN_APP_TASK_ERROR_TASK_IDENTIFIER = 'thrown_app_task_error_task'
const THROWN_INVALID_APP_TASK_ERROR_TASK_IDENTIFIER =
  'thrown_invalid_app_task_error_task'
const THROWN_APP_TASK_ERROR_WITH_REQUEUE_TASK_IDENTIFIER =
  'thrown_script_error_with_requeue_task'
const EXECUTION_ERROR_TASK_IDENTIFIER = 'execution_error_task'
const CONTENT_OBJECT_KEY = 'sample.txt'

const WORKER_ENV_VARS = {
  TEST_FLAG: 'true',
}

const WORKER_SOURCE = `import { AppTaskError, type RequestHandler, type TaskHandler } from '@lombokapp/app-worker-sdk'

export const handleTask: TaskHandler = async function handleTask(task) {
  if (process.env.WORKER_ENV_TEST_FLAG !== 'true') {
    throw new Error('Missing worker env flag')
  }

  if (task.taskIdentifier === '${SCRIPT_ERROR_TASK_IDENTIFIER}') {
    throw new Error('Script error for test')
  }

  if (task.taskIdentifier === '${THROWN_APP_TASK_ERROR_TASK_IDENTIFIER}') {
    throw new AppTaskError('CUSTOM_APP_ERROR_CODE', 'This is a custom error message from the app')
  }

  if (task.taskIdentifier === '${UNEXPECTED_SCRIPT_ERROR_TASK_IDENTIFIER}') {
    thisVarDoesNotExist.anything()
  }

  if (task.taskIdentifier === '${THROWN_APP_TASK_ERROR_WITH_REQUEUE_TASK_IDENTIFIER}') {
    throw new AppTaskError('CUSTOM_APP_ERROR_CODE_WITH_REQUEUE', 'This is a custom error message from the app', {}, 10000)
  }
  if (task.taskIdentifier === '${THROWN_INVALID_APP_TASK_ERROR_TASK_IDENTIFIER}') {
    throw new AppTaskError('CUSTOM_APP_ERROR_CODE_INVALID', 'This is a custom error message from the app', {}, {
      badInput: 'This is a bad input (requeueDelayMs should be a number)',
    })
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
  let originalGetWorkerExecConfig:
    | typeof AppService.prototype.getWorkerExecConfig
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
      subscribedCoreEvents: [],
      permissions: {
        core: [],
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
        [EXECUTION_ERROR_WORKER_IDENTIFIER]: {
          description: 'Execution error test worker',
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
            type: 'runtime',
            identifier: WORKER_IDENTIFIER,
          },
        },
        {
          identifier: SCRIPT_ERROR_TASK_IDENTIFIER,
          label: 'Script Error Task',
          description: 'Task that throws a script error for core worker tests',
          handler: {
            type: 'runtime',
            identifier: WORKER_IDENTIFIER,
          },
        },
        {
          identifier: EXECUTION_ERROR_TASK_IDENTIFIER,
          label: 'Execution Error Task',
          description: 'Task that simulates a worker execution failure',
          handler: {
            type: 'runtime',
            identifier: EXECUTION_ERROR_WORKER_IDENTIFIER,
          },
        },
        {
          identifier: THROWN_APP_TASK_ERROR_TASK_IDENTIFIER,
          label: 'Explicitly Thrown AppTaskError Task',
          description:
            'Task that simulates an explicitly thrown app runtime error',
          handler: {
            type: 'runtime',
            identifier: WORKER_IDENTIFIER,
          },
        },
        {
          identifier: UNEXPECTED_SCRIPT_ERROR_TASK_IDENTIFIER,
          label: 'Unexpected Script Error Task',
          description: 'Task that simulates an unexpected app runtime error',
          handler: {
            type: 'runtime',
            identifier: WORKER_IDENTIFIER,
          },
        },
        {
          identifier: THROWN_APP_TASK_ERROR_WITH_REQUEUE_TASK_IDENTIFIER,
          label: 'Explicitly Thrown AppTaskError Task (with requeue)',
          description:
            'Task that simulates an explicitly thrown app runtime error with requeue',
          handler: {
            type: 'runtime',
            identifier: WORKER_IDENTIFIER,
          },
        },
        {
          identifier: THROWN_INVALID_APP_TASK_ERROR_TASK_IDENTIFIER,
          label: 'Explicitly Thrown Invalid AppTaskError Task',
          description:
            'Task that simulates an explicitly thrown app runtime error',
          handler: {
            type: 'runtime',
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
      invocation: {
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

  const findRunServerlessWorkerTasks = async (innerTaskId: string) => {
    if (!testModule) {
      throw new Error('Test module not initialized')
    }

    const coreTasks =
      await testModule.services.ormService.db.query.tasksTable.findMany({
        where: and(
          eq(tasksTable.ownerIdentifier, CORE_IDENTIFIER),
          eq(tasksTable.taskIdentifier, CoreTaskName.RunServerlessWorker),
        ),
        orderBy: [asc(tasksTable.createdAt)],
      })

    return coreTasks.filter((task) => {
      const invokeContext = task.invocation.invokeContext as
        | { eventData?: { innerTaskId?: string } }
        | undefined
      return invokeContext?.eventData?.innerTaskId === innerTaskId
    })
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
    originalGetWorkerExecConfig = AppService.prototype.getWorkerExecConfig
    getWorkerExecConfigSpy = spyOn(
      AppService.prototype,
      'getWorkerExecConfig',
    ).mockImplementation(async function (this: AppService, ...args) {
      // Call the original implementation with the correct 'this' context
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const getWorkerExecConfigResult = await originalGetWorkerExecConfig!.call(
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
      await testModule!.services.coreWorkerService.executeServerlessAppTask({
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

  it('records script errors on inner tasks while completing run_serverless_worker', async () => {
    await runWithThreadContext(crypto.randomUUID(), async () => {
      const innerTask =
        await testModule!.services.taskService.triggerAppActionTask({
          appIdentifier: installedAppIdentifier,
          taskIdentifier: SCRIPT_ERROR_TASK_IDENTIFIER,
          taskData: {},
        })

      await testModule!.waitForTasks('completed', {
        taskIds: [innerTask.id],
      })

      const updatedInnerTask =
        await testModule!.services.ormService.db.query.tasksTable.findFirst({
          where: eq(tasksTable.id, innerTask.id),
        })
      if (!updatedInnerTask) {
        throw new Error('Inner task not found after execution')
      }

      const outerTasks = await findRunServerlessWorkerTasks(innerTask.id)
      const outerTask = outerTasks[0]
      if (!outerTask) {
        throw new Error('Run serverless worker task not found')
      }

      expect(updatedInnerTask.success).toBe(false)
      expect(updatedInnerTask.error?.code).toBe('UNEXPECTED_ERROR')
      const innerErrorDetails = updatedInnerTask.error?.details as
        | { message?: string }
        | undefined
      expect(innerErrorDetails?.message).toBe('Script error for test')

      expect(outerTask.success).toBe(true)
      expect(outerTask.error).toBeFalsy()
    })
  })

  it('handles unexpected runtime error from serverless worker script', async () => {
    await runWithThreadContext(crypto.randomUUID(), async () => {
      const innerTask =
        await testModule!.services.taskService.triggerAppActionTask({
          appIdentifier: installedAppIdentifier,
          taskIdentifier: UNEXPECTED_SCRIPT_ERROR_TASK_IDENTIFIER,
          taskData: {},
        })

      await testModule!.waitForTasks('completed', {
        taskIds: [innerTask.id],
      })

      const updatedInnerTask =
        await testModule!.services.ormService.db.query.tasksTable.findFirst({
          where: eq(tasksTable.id, innerTask.id),
        })
      if (!updatedInnerTask) {
        throw new Error('Inner task not found after execution')
      }

      const outerTasks = await findRunServerlessWorkerTasks(innerTask.id)
      const outerTask = outerTasks[0]

      if (!outerTask) {
        throw new Error('Run serverless worker task not found')
      }

      expect(updatedInnerTask.success).toBe(false)
      expect(updatedInnerTask.startedAt).not.toBeNull()
      expect(updatedInnerTask.error?.code).toBe('UNEXPECTED_ERROR')
      expect(updatedInnerTask.error?.name).toBe('ReferenceError')
      expect(updatedInnerTask.error?.message).toBe(
        'thisVarDoesNotExist is not defined',
      )
      expect(updatedInnerTask.error?.details).toEqual({
        message: 'thisVarDoesNotExist is not defined',
        name: 'ReferenceError',
        code: 'UNEXPECTED_ERROR',
        origin: 'app',
        stack: expect.any(String) as string,
      })
      expect(outerTask.error).toBeNull()
      expect(outerTask.success).toBeTrue()
      expect(outerTask.systemLog).toEqual([
        {
          at: expect.any(Date) as Date,
          logType: 'started',
          message: 'Task is started',
        },
        {
          at: expect.any(Date) as Date,
          logType: 'success',
          message: 'Task completed successfully',
        },
      ])
    })
  })

  it('handles thrown AppTaskError from serverless worker script', async () => {
    await runWithThreadContext(crypto.randomUUID(), async () => {
      const innerTask =
        await testModule!.services.taskService.triggerAppActionTask({
          appIdentifier: installedAppIdentifier,
          taskIdentifier: THROWN_APP_TASK_ERROR_TASK_IDENTIFIER,
          taskData: {},
        })

      await testModule!.waitForTasks('completed', {
        taskIds: [innerTask.id],
      })

      const updatedInnerTask =
        await testModule!.services.ormService.db.query.tasksTable.findFirst({
          where: eq(tasksTable.id, innerTask.id),
        })
      if (!updatedInnerTask) {
        throw new Error('Inner task not found after execution')
      }

      const outerTasks = await findRunServerlessWorkerTasks(innerTask.id)
      const outerTask = outerTasks[0]
      if (!outerTask) {
        throw new Error('Run serverless worker task not found')
      }

      expect(updatedInnerTask.success).toBe(false)
      expect(updatedInnerTask.error?.code).toBe('CUSTOM_APP_ERROR_CODE')
      expect(updatedInnerTask.error?.name).toBe('Error')
      expect(updatedInnerTask.error?.message).toBe(
        'This is a custom error message from the app',
      )
      expect(updatedInnerTask.error?.details).toEqual({
        message: 'This is a custom error message from the app',
        name: 'Error',
        code: 'CUSTOM_APP_ERROR_CODE',
        origin: 'app',
        stack: expect.any(String) as string,
      })
      expect(outerTask.error).toBeNull()
      expect(outerTask.success).toBeTrue()
      expect(outerTask.systemLog).toEqual([
        {
          at: expect.any(Date) as Date,
          logType: 'started',
          message: 'Task is started',
        },
        {
          at: expect.any(Date) as Date,
          logType: 'success',
          message: 'Task completed successfully',
        },
      ])
    })
  })

  it('handles thrown AppTaskError from serverless worker script with requeue', async () => {
    await runWithThreadContext(crypto.randomUUID(), async () => {
      const innerTask =
        await testModule!.services.taskService.triggerAppActionTask({
          appIdentifier: installedAppIdentifier,
          taskIdentifier: THROWN_APP_TASK_ERROR_WITH_REQUEUE_TASK_IDENTIFIER,
          taskData: {},
        })

      void testModule!.services.coreTaskService.startDrainCoreTasks()
      await testModule!.waitForTasks('attempted', {
        taskIds: [innerTask.id],
      })

      const updatedInnerTask =
        await testModule!.services.ormService.db.query.tasksTable.findFirst({
          where: eq(tasksTable.id, innerTask.id),
        })
      if (!updatedInnerTask) {
        throw new Error('Inner task not found after execution')
      }

      const runnerTasks = await findRunServerlessWorkerTasks(innerTask.id)
      const runnerTask = runnerTasks[0]
      if (!runnerTask) {
        throw new Error('Run serverless worker task not found')
      }

      await testModule!.waitForTasks('completed', {
        taskIds: [runnerTask.id],
      })

      expect(updatedInnerTask.success).toBeNull()
      expect(updatedInnerTask.systemLog).toEqual([
        {
          at: expect.any(Date) as Date,
          logType: 'started',
          message: 'Task is started',
          payload: {
            __executor: {
              kind: 'core_worker',
            },
          },
        },
        {
          at: expect.any(Date) as Date,
          logType: 'error',
          message: 'Task failed',
          payload: {
            error: {
              name: 'Error',
              message: 'This is a custom error message from the app',
              code: 'CUSTOM_APP_ERROR_CODE_WITH_REQUEUE',
              details: {
                code: 'CUSTOM_APP_ERROR_CODE_WITH_REQUEUE',
                message: 'This is a custom error message from the app',
                name: 'Error',
                origin: 'app',
                requeueDelayMs: 10000,
                stack: expect.any(String) as string,
              },
              stack: expect.any(String) as string,
            },
          },
        },
        {
          at: expect.any(Date) as Date,
          logType: 'requeue',
          message: 'Task is requeued',
          payload: {
            requeueDelayMs: 10000,
            dontStartBefore: expect.any(String) as string,
          },
        },
      ])

      expect(runnerTask.error).toBeNull()
      expect(runnerTask.success).toBeTrue()
      expect(runnerTask.systemLog).toEqual([
        {
          at: expect.any(Date) as Date,
          logType: 'started',
          message: 'Task is started',
        },
        {
          at: expect.any(Date) as Date,
          logType: 'success',
          message: 'Task completed successfully',
        },
      ])

      const newRunnerTasks = await findRunServerlessWorkerTasks(innerTask.id)
      const newRunnerTask = newRunnerTasks.at(-1)
      expect(newRunnerTask).toBeDefined()
      expect(newRunnerTask?.createdAt.getTime()).toBeGreaterThan(
        innerTask.createdAt.getTime(),
      )
    })
  })

  it('handles invalid thrown AppTaskError from serverless worker script', async () => {
    await runWithThreadContext(crypto.randomUUID(), async () => {
      const innerTask =
        await testModule!.services.taskService.triggerAppActionTask({
          appIdentifier: installedAppIdentifier,
          taskIdentifier: THROWN_INVALID_APP_TASK_ERROR_TASK_IDENTIFIER,
          taskData: {},
        })

      await testModule!.waitForTasks('attempted', {
        taskIds: [innerTask.id],
      })

      const updatedInnerTask =
        await testModule!.services.ormService.db.query.tasksTable.findFirst({
          where: eq(tasksTable.id, innerTask.id),
        })
      if (!updatedInnerTask) {
        throw new Error('Inner task not found after execution')
      }

      const outerTasks = await findRunServerlessWorkerTasks(innerTask.id)
      const outerTask = outerTasks[0]
      if (!outerTask) {
        throw new Error('Run serverless worker task not found')
      }

      expect(updatedInnerTask.success).toBeFalse()
      expect(updatedInnerTask.systemLog).toEqual([
        {
          at: expect.any(Date) as Date,
          logType: 'started',
          message: 'Task is started',
          payload: {
            __executor: {
              kind: 'core_worker',
            },
          },
        },
        {
          at: expect.any(Date) as Date,
          logType: 'error',
          message: 'Task failed',
          payload: {
            error: {
              name: 'InvalidAppTaskError',
              message: 'The thrown AppTaskError was invalid',
              code: 'INVALID_APP_TASK_ERROR',
              details: {
                name: 'InvalidAppTaskError',
                origin: 'app',
                message: 'The thrown AppTaskError was invalid',
                code: 'INVALID_APP_TASK_ERROR',
                details: {
                  originalError: {
                    code: 'CUSTOM_APP_ERROR_CODE_INVALID',
                    message: 'This is a custom error message from the app',
                    name: 'Error',
                    requeueDelayMs: {
                      badInput:
                        'This is a bad input (requeueDelayMs should be a number)',
                    },
                    stack: expect.any(String) as string,
                  },
                  validationError:
                    'Requeue delay must be a non-negative number',
                },
                stack: expect.any(String) as string,
              },
              stack: expect.any(String) as string,
            },
          },
        },
      ])

      expect(outerTask.error).toBeNull()
      expect(outerTask.success).toBeTrue()
      expect(outerTask.systemLog).toEqual([
        {
          at: expect.any(Date) as Date,
          logType: 'started',
          message: 'Task is started',
        },
        {
          at: expect.any(Date) as Date,
          logType: 'success',
          message: 'Task completed successfully',
        },
      ])
    })
  })

  it('records execution errors on outer tasks with generic inner errors', async () => {
    if (!getWorkerExecConfigSpy || !originalGetWorkerExecConfig) {
      throw new Error('Worker exec config spy not initialized')
    }

    getWorkerExecConfigSpy.mockImplementationOnce(async function (
      this: AppService,
      ...args
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const getWorkerExecConfigResult = await originalGetWorkerExecConfig!.call(
        this,
        ...args,
      )
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return {
        ...getWorkerExecConfigResult,
        payloadUrl: 'http://127.0.0.1:1/invalid-worker.zip',
        hash: `invalid-hash-${Date.now()}`,
      }
    })

    await runWithThreadContext(crypto.randomUUID(), async () => {
      const innerTask =
        await testModule!.services.taskService.triggerAppActionTask({
          appIdentifier: installedAppIdentifier,
          taskIdentifier: EXECUTION_ERROR_TASK_IDENTIFIER,
          taskData: {},
        })

      await testModule!.waitForTasks('completed', {
        taskIds: [innerTask.id],
      })

      const updatedInnerTask =
        await testModule!.services.ormService.db.query.tasksTable.findFirst({
          where: eq(tasksTable.id, innerTask.id),
        })
      if (!updatedInnerTask) {
        throw new Error('Inner task not found after execution')
      }

      const outerTasks = await findRunServerlessWorkerTasks(innerTask.id)
      const outerTask = outerTasks[0]
      if (!outerTask) {
        throw new Error('Run serverless worker task not found')
      }
      expect(updatedInnerTask.success).toBe(false)
      expect(updatedInnerTask.error?.code).toBe('EXECUTION_ERROR')
      expect(updatedInnerTask.error?.details).toBeFalsy()

      expect(outerTask.success).toBe(false)
      expect(outerTask.error?.code).toBe(
        'UNEXPECTED_ERROR_DURING_CORE_REQUEST_HANDLING',
      )
      const outerErrorDetails = outerTask.error?.details
      const outerErrorDetailsDetails = outerErrorDetails?.details as
        | JsonSerializableObject
        | undefined
      expect(outerErrorDetailsDetails?.action).toBe('execute_task')
      expect(outerErrorDetails?.cause).toBeDefined()
      expect(
        (outerErrorDetails?.cause as JsonSerializableObject | undefined)
          ?.message,
      ).toBe('Download failed when connecting to host (unknown status)')
    })
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

    const reindexTask =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: and(
          eq(tasksTable.taskIdentifier, CoreTaskName.ReindexFolder),
          eq(tasksTable.ownerIdentifier, CORE_IDENTIFIER),
        ),
      })

    if (!reindexTask) {
      throw new Error('Reindex task not found')
    }

    await testModule!.waitForTasks('completed', {
      taskIds: [reindexTask.id],
    })

    const folderObject =
      await testModule!.services.ormService.db.query.folderObjectsTable.findFirst(
        {
          where: and(
            eq(folderObjectsTable.folderId, folder.id),
            eq(folderObjectsTable.objectKey, CONTENT_OBJECT_KEY),
          ),
        },
      )

    await testModule!.waitForTasks('completed')

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
