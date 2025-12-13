/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { IAppPlatformService } from '@lombokapp/app-worker-sdk'
import type {
  JsonSerializableObject,
  LogEntryLevel,
  SignedURLsRequestMethod,
} from '@lombokapp/types'
import { PLATFORM_IDENTIFIER, PlatformEvent } from '@lombokapp/types'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from 'bun:test'
import fs from 'fs'
import { createServer } from 'http'
import os from 'os'
import path from 'path'
import { Server as IOServer } from 'socket.io'
import { v4 as uuidV4 } from 'uuid'

import { buildTestServerClient } from '../../test/test-server-client.mock'
import { bulidRunWorkerScriptTaskHandler } from './run-worker-script-handler'

describe('Run Worker Script Task Handler', () => {
  const WORKER_BUNDLE_URL = 'https://example.com/worker-bundle.zip'
  let fixturesDir: string
  let workerSrcDir: string
  let workerZipPath: string
  let ioServer: IOServer | undefined
  let httpServer: ReturnType<typeof createServer> | undefined
  let serverBaseUrl = ''
  let currentServerClient: IAppPlatformService | undefined

  const mockFetch = mock()

  beforeAll(async () => {
    fixturesDir = path.join(
      os.tmpdir(),
      `core-worker-test-fixtures-${uuidV4()}`,
    )
    workerSrcDir = path.join(fixturesDir, 'worker-src')
    fs.mkdirSync(workerSrcDir, { recursive: true })

    // Minimal worker entrypoint that matches demo_object_added_worker's shape
    const workerIndexTs = `
import type { TaskHandler } from '@lombokapp/app-worker-sdk'
import { SignedURLsRequestMethod } from '@lombokapp/types'

export const handleTask: TaskHandler = async function handleTask(task, { serverClient }) {
  await serverClient.getContentSignedUrls([
    {
      folderId: task.subjectFolderId || 'test-folder',
      objectKey: task.subjectObjectKey || 'test-object',
      method: SignedURLsRequestMethod.GET,
    },
  ])
  console.log('Worker executed handleTask for', task.taskIdentifier)
}
`

    fs.writeFileSync(path.join(workerSrcDir, 'index.ts'), workerIndexTs)

    // Create a zip bundle of the worker source
    workerZipPath = path.join(fixturesDir, 'worker-bundle.zip')
    const zipProc = Bun.spawn({
      cmd: ['zip', '-r', workerZipPath, '.'],
      cwd: workerSrcDir,
      stdout: 'inherit',
      stderr: 'inherit',
    })
    const zipCode = await zipProc.exited
    if (zipCode !== 0) {
      throw new Error('Failed to build test worker zip bundle')
    }

    // Start a real Socket.IO server that the worker connects to
    httpServer = createServer()
    ioServer = new IOServer(httpServer, { cors: { origin: '*' } })
    const appsNamespace = ioServer.of('/apps')
    appsNamespace.on('connection', (socket) => {
      socket.on(
        'APP_API',
        async (
          payload: { name: string; data?: unknown },
          ack: (response: unknown) => void,
        ) => {
          try {
            if (!currentServerClient) {
              ack({ result: undefined })
              return
            }
            switch (payload.name) {
              case 'GET_CONTENT_SIGNED_URLS': {
                const data = payload.data as {
                  requests: {
                    folderId: string
                    objectKey: string
                    method: SignedURLsRequestMethod
                  }[]
                }
                const res = await currentServerClient.getContentSignedUrls(
                  data.requests,
                )
                ack(res)
                return
              }
              case 'SAVE_LOG_ENTRY': {
                const data = payload.data as {
                  message: string
                  level: LogEntryLevel
                  data: JsonSerializableObject
                  targetLocation:
                    | { folderId: string; objectKey?: string | undefined }
                    | undefined
                }
                const res = await currentServerClient.saveLogEntry(data)
                ack(res)
                return
              }
              default: {
                ack({ result: undefined })
              }
            }
          } catch (err) {
            ack({
              error: {
                code: 'SERVER_ERROR',
                message: err instanceof Error ? err.message : String(err),
              },
            })
          }
        },
      )
    })

    await new Promise<void>((resolve) => {
      const srv = httpServer
      if (!srv) {
        throw new Error('HTTP server not initialized')
      }
      srv.listen(0, '127.0.0.1', () => resolve())
    })
    const address = httpServer.address()
    if (address && typeof address === 'object') {
      serverBaseUrl = `http://127.0.0.1:${address.port}`
    } else {
      throw new Error('Unable to determine Socket.IO server address')
    }
  })

  beforeEach(() => {
    // Reset and mock global fetch
    mockFetch.mockReset()
    global.fetch = mockFetch as unknown as typeof fetch

    // Serve the worker bundle from mocked fetch
    const zipBytes = fs.readFileSync(workerZipPath)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([
        ['content-type', 'application/zip'],
        ['content-length', String(zipBytes.byteLength)],
      ]),
      body: {
        getReader: () => {
          let done = false
          return {
            read: () => {
              if (done) {
                return Promise.resolve({ done: true, value: undefined })
              }
              done = true
              return Promise.resolve({ done: false, value: zipBytes })
            },
          }
        },
      },
    })
  })

  afterAll(async () => {
    // Force close socket.io server with timeout
    if (ioServer) {
      // Disconnect all sockets in all namespaces immediately
      for (const [_namespaceName, namespace] of ioServer._nsps) {
        namespace.disconnectSockets(true)
      }
      // Also disconnect from default namespace
      ioServer.disconnectSockets(true)

      // Close with timeout
      await Promise.race([
        new Promise<void>((resolve) => {
          void ioServer!.close(() => resolve())
        }),
        new Promise<void>((resolve) => {
          setTimeout(() => {
            // Force close if timeout
            resolve()
          }, 1000)
        }),
      ])
    }

    // Force close HTTP server with timeout
    if (httpServer) {
      await Promise.race([
        new Promise<void>((resolve) => {
          httpServer!.close(() => resolve())
        }),
        new Promise<void>((resolve) => {
          setTimeout(() => {
            // Force destroy if timeout
            if ('closeAllConnections' in httpServer!) {
              ;(
                httpServer as { closeAllConnections: () => void }
              ).closeAllConnections()
            }
            resolve()
          }, 1000)
        }),
      ])
    }
  })

  it('completes run-worker-script task successfully', async () => {
    // Mock run_worker_script task and the underlying worker script task
    const workerScriptTask = {
      id: uuidV4(),
      ownerIdentifier: 'core-worker',
      trigger: {
        kind: 'event' as const,
        eventIdentifier: PlatformEvent.object_added,
        invokeContext: {
          eventId: uuidV4(),
          emitterIdentifier: PLATFORM_IDENTIFIER,
          eventData: {} as JsonSerializableObject,
        },
      },
      taskDescription: 'object_added',
      systemLog: [],
      taskLog: [],
      taskIdentifier: 'object_added_task',
      data: {} as JsonSerializableObject,
      targetLocation: {
        folderId: uuidV4(),
        objectKey: 'test-object-key',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const runWorkerScriptEnvelopeTask = {
      id: uuidV4(),
      ownerIdentifier: 'core-worker',
      trigger: {
        kind: 'event' as const,
        eventIdentifier: PlatformEvent.object_added,
        invokeContext: {
          eventId: uuidV4(),
          emitterIdentifier: PLATFORM_IDENTIFIER,
          eventData: {} as JsonSerializableObject,
        },
      },
      systemLog: [],
      taskLog: [],
      taskDescription: 'run_worker_script',
      taskIdentifier: 'run_worker_script',
      data: {
        innerTaskId: workerScriptTask.id,
        appIdentifier: 'core-worker',
        workerIdentifier: 'test-worker',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    let completed = false
    let failed = false
    let getContentSignedUrlsCalled = false

    const mockServerClient: IAppPlatformService = buildTestServerClient({
      getServerBaseUrl: () => serverBaseUrl,
      // return a Promise but avoid async-without-await lint
      getWorkerExecutionDetails: () =>
        Promise.resolve({
          result: {
            entrypoint: 'index.ts',
            workerToken: 'test-token',
            environmentVariables: {},
            hash: 'test-worker-hash',
            payloadUrl: WORKER_BUNDLE_URL,
          },
        }),
      attemptStartHandleTaskById: () =>
        Promise.resolve({
          result: {
            task: workerScriptTask,
          },
        }),
      attemptStartHandleAnyAvailableTask: () =>
        Promise.resolve({
          result: {
            task: workerScriptTask,
          },
        }),
      completeHandleTask: ({
        success,
      }: {
        success: boolean
        taskId: string
        error?: {
          code: string
          message: string
          details?: JsonSerializableObject
        }
      }) => {
        completed = !!success
        failed = !success
        return Promise.resolve({ result: undefined })
      },
      getContentSignedUrls: () => {
        getContentSignedUrlsCalled = true
        return Promise.resolve({
          result: [
            {
              url: 'https://example.com/test-image.png',
              folderId: String(workerScriptTask.targetLocation.folderId),
              objectKey: String(workerScriptTask.targetLocation.objectKey),
            },
          ],
        })
      },
    })

    // Make the socket server delegate API calls to this mock
    currentServerClient = mockServerClient

    const handler = bulidRunWorkerScriptTaskHandler({
      printWorkerOutput: false,
      removeWorkerDirectory: true,
    })

    await handler(runWorkerScriptEnvelopeTask, mockServerClient)

    expect(failed).toBe(false)
    expect(completed).toBe(true)
    expect(getContentSignedUrlsCalled).toBe(true)
  })
})
/* eslint-enable @typescript-eslint/no-non-null-assertion */
