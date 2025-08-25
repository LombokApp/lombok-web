import type { LombokApiClient, paths } from '@lombokapp/types'
import { SignedURLsRequestMethod } from '@lombokapp/types'
import { objectIdentifierToObjectKey } from '@lombokapp/utils'
import createFetchClient from 'openapi-fetch'

export enum LogLevel {
  TRACE = 'TRACE',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

import { indexedDb } from './services/indexed-db'
import { addFileToLocalFileStorage } from './services/local-cache/local-cache.service'

const downloading: Record<string, { progressPercent: number } | undefined> = {}

// updated on incoming auth udpate message
let $apiClient: LombokApiClient

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AsyncWorkerMessage = [string, any]

const log = (logMessage: {
  message: string
  level: LogLevel
  folderId?: string
  objectIdentifier?: string
}) => {
  // console.log('logMessage:', logMessage)
  postMessage(['LOG_MESSAGE', logMessage])
}

const isLocal = async (folderId: string, objectIdentifier: string) => {
  return !!(await indexedDb.getMetadata(`${folderId}:${objectIdentifier}`))
    .result
}

const recentlyRequested: Record<
  string,
  | {
      callbacks?: {
        resolve: (url: string) => void
        reject: (e: unknown) => void
      }
      promise?: Promise<string>
    }
  | undefined
> = {}

const presignedURLBufferContext: Record<
  string,
  {
    batchBuffer: string[]
    lastTimeExecuted?: number
  }
> = {}

const maybeSendBatch = (folderId: string) => {
  const folderBatch = presignedURLBufferContext[folderId] ?? {
    batchBuffer: [],
    lastTimeExecuted: Date.now(),
  }
  presignedURLBufferContext[folderId] = folderBatch
  if (
    folderBatch.batchBuffer.length > 0 &&
    folderBatch.lastTimeExecuted &&
    (folderBatch.lastTimeExecuted < Date.now() - 250 ||
      folderBatch.batchBuffer.length > 25)
  ) {
    // console.log(
    //   'fetching folderBatch[+%s seconds]: %s',
    //   (Date.now() - startupTime) / 1000,
    //   JSON.stringify(folderBatch, null, 2),
    // )
    // more than 1s since the last batch fetch. Executing now...
    const toFetch = folderBatch.batchBuffer.splice(
      0,
      folderBatch.batchBuffer.length,
    )
    folderBatch.lastTimeExecuted = Date.now()
    void $apiClient
      .POST('/api/v1/folders/{folderId}/presigned-urls', {
        params: {
          path: {
            folderId,
          },
        },
        body: toFetch.map((k) => ({
          method: SignedURLsRequestMethod.GET,
          objectIdentifier: k,
        })),
      })
      .then(({ response, data }) => {
        if (response.status === 201 && data) {
          data.urls.forEach((result, i) => {
            const entry = recentlyRequested[`${folderId}:${toFetch[i]}`]
            if (entry?.callbacks?.resolve) {
              entry.callbacks.resolve(result)
            }
            setTimeout(() => {
              recentlyRequested[`${folderId}:${toFetch[i]}`] = undefined
            }, 10000)
          })
        }
      })
      .catch((e) => {
        toFetch.forEach((k) => {
          const entry = recentlyRequested[`${folderId}:${k}`]
          if (entry) {
            recentlyRequested[`${folderId}:${k}`] = undefined
            if (entry.callbacks?.reject) {
              entry.callbacks.reject(e)
            }
          }
        })
      })
  }
}

const requestDownloadUrlAndMaybeSendBatch = (
  folderId: string,
  objectIdentifier: string,
) => {
  const folderObjectKey = `${folderId}:${objectIdentifier}`
  const folderBatch = presignedURLBufferContext[folderId] ?? {
    batchBuffer: [],
    lastTimeExecuted: Date.now(),
  }
  presignedURLBufferContext[folderId] = folderBatch
  presignedURLBufferContext[folderId].batchBuffer.push(objectIdentifier)
  if (presignedURLBufferContext[folderId].batchBuffer.length === 1) {
    presignedURLBufferContext[folderId].lastTimeExecuted = Date.now()
  }

  recentlyRequested[folderObjectKey] = {}

  recentlyRequested[folderObjectKey].promise = new Promise<string>(
    (resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      recentlyRequested[folderObjectKey]!.callbacks = { resolve, reject }
    },
  )
  maybeSendBatch(folderId)
}

setInterval(() => {
  for (const folderId of Object.keys(presignedURLBufferContext)) {
    maybeSendBatch(folderId)
  }
}, 100)

const getDownloadUrl = async (folderId: string, objectIdentifier: string) => {
  const folderObjectKey = `${folderId}:${objectIdentifier}`
  if (!(folderObjectKey in recentlyRequested)) {
    requestDownloadUrlAndMaybeSendBatch(folderId, objectIdentifier)
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
  return recentlyRequested[folderObjectKey]?.promise!
}

const downloadLocally = async (
  folderId: string,
  objectIdentifier: string,
): Promise<boolean> => {
  const folderIdAndKey = `${folderId}:${objectIdentifier}`
  // console.log('starting to download...')
  const isDataLocal = await isLocal(folderId, objectIdentifier)
  if (!isDataLocal && !downloading[folderIdAndKey]) {
    downloading[folderIdAndKey] = { progressPercent: 0 }
    const downloadURL = await getDownloadUrl(folderId, objectIdentifier)
    // console.log('about to start download:', downloadURL)
    log({
      level: LogLevel.INFO,
      folderId,
      objectIdentifier,
      message: `Downloading '${objectIdentifier}' ...`,
    })
    try {
      const response = await fetch(downloadURL)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body reader available')
      }

      const chunks: Uint8Array[] = []
      let loaded = 0
      const contentLength = response.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : 0

      for (;;) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }

        chunks.push(value)
        loaded += value.length
        if (total > 0) {
          const percentCompleted = Math.round((loaded * 100) / total)
          downloading[folderIdAndKey] = { progressPercent: percentCompleted }
        }
      }

      const blob = new Blob(chunks as BlobPart[])

      log({
        level: LogLevel.INFO,
        folderId,
        objectIdentifier,
        message: `Downloaded '${objectIdentifier}'`,
      })

      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete downloading[folderIdAndKey]
      await addFileToLocalFileStorage(folderId, objectIdentifier, blob)
      return true
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete downloading[folderIdAndKey]
      log({
        level: LogLevel.ERROR,
        folderId,
        objectIdentifier,
        message: `Error downloading '${objectIdentifier}'`,
      })
      throw e
    }
  }
  return false
}

const messageHandler = (event: MessageEvent<AsyncWorkerMessage>) => {
  const message = event.data
  // console.log('WORKER event.data', event.data)
  if (message[0] === 'UPLOAD') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const folderId: string = message[1].folderId
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const objectIdentifier: string = message[1].objectIdentifier
    log({
      level: LogLevel.INFO,
      folderId,
      objectIdentifier,
      message: `Upload of '${objectIdentifier}' started`,
    })
    // TODO: type check this with zod
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const uploadFile: File = message[1].uploadFile
    void $apiClient
      .POST('/api/v1/folders/{folderId}/presigned-urls', {
        params: {
          path: {
            folderId,
          },
        },
        body: [
          {
            objectIdentifier,
            method: SignedURLsRequestMethod.PUT,
          },
        ],
      })
      .then((response) => {
        if (response.response.status === 201 && response.data) {
          return response.data
        }
        throw new Error('Failed to get presigned url')
      })
      .then(async ({ urls }) => {
        const uploadSlot = urls[0]
        if (!uploadSlot) {
          return
        }
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()

          xhr.upload.addEventListener('progress', (progressEvent) => {
            if (progressEvent.lengthComputable) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total,
              )
              postMessage([
                'UPLOAD_PROGRESS',
                {
                  progress: percentCompleted,
                  objectKey: uploadFile.name,
                },
              ])
            }
          })

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve()
            } else {
              reject(new Error(`Upload failed with status: ${xhr.status}`))
            }
          })

          xhr.addEventListener('error', (e: unknown) => {
            reject(e instanceof Error ? e : new Error(String(e)))
          })

          xhr.open('PUT', uploadSlot)
          xhr.setRequestHeader('Content-Type', uploadFile.type)
          xhr.setRequestHeader('Content-Encoding', 'base64')
          xhr.send(uploadFile)
        })

        // have the app ingest the file
        await $apiClient.POST(
          '/api/v1/folders/{folderId}/objects/{objectKey}/refresh',
          {
            params: {
              path: {
                folderId,
                objectKey:
                  objectIdentifierToObjectKey(objectIdentifier).objectKey,
              },
            },
          },
        )

        log({
          level: LogLevel.INFO,
          folderId,
          objectIdentifier,
          message: `Upload of '${objectIdentifier}' complete`,
        })
      })
  } else if (message[0] === 'DOWNLOAD') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const folderIdAndKey = `${message[1].folderId}:${message[1].objectIdentifier}`
    void downloadLocally(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      message[1].folderId as string,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      message[1].objectIdentifier as string,
    )
      .then(() => {
        postMessage([
          'DOWNLOAD_COMPLETED',
          {
            // TODO: type check this with zod
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            folderId: message[1].folderId,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            objectIdentifier: message[1].objectIdentifier,
          },
        ])
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.log('DOWNLOAD ERROR:', e)
        postMessage([
          'DOWNLOAD_FAILED',
          {
            // TODO: type check this with zod
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            folderId: message[1].folderId,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            objectIdentifier: message[1].objectIdentifier,
          },
        ])
      })
      .finally(() => {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete downloading[folderIdAndKey]
      })
  } else if (message[0] === 'AUTH_UPDATED') {
    $apiClient = createFetchClient<paths>({
      baseUrl: (message[1] as { basePath: string }).basePath,
      fetch: async (request) => {
        const headers = new Headers(request.headers)
        headers.set(
          'Authorization',
          `Bearer ${(message[1] as { accessToken: string }).accessToken}`,
        )
        return fetch(new Request(request, { headers }))
      },
    })
  }
}

self.addEventListener('message', (m) =>
  messageHandler(m as MessageEvent<AsyncWorkerMessage>),
)

postMessage(['REQUEST_AUTH_UPDATE'])

export {}
