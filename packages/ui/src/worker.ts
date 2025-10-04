import type { LombokApiClient, paths } from '@lombokapp/types'
import { SignedURLsRequestMethod } from '@lombokapp/types'
import {
  encodeS3ObjectKey,
  objectIdentifierToObjectKey,
} from '@lombokapp/utils'
import createFetchClient from 'openapi-fetch'

export enum LogLevel {
  TRACE = 'TRACE',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

interface Entry<V> {
  value: V
  /** Unix ms when the entry expires */
  expiresAt: number
}

export class LruTtlCache<K, V> {
  private readonly map = new Map<K, Entry<V>>()

  constructor(
    private readonly maxSize: number,
    private readonly defaultTtlMs: number,
  ) {
    if (maxSize <= 0) {
      throw new Error('maxSize must be > 0')
    }
    if (defaultTtlMs <= 0) {
      throw new Error('defaultTtlMs must be > 0')
    }
  }

  /** Get a value, promoting recency. Expired entries are dropped. */
  get(key: K): V | undefined {
    const e = this.map.get(key)
    if (!e) {
      return undefined
    }
    if (this.isExpired(e)) {
      this.map.delete(key)
      return undefined
    }
    // Promote to most-recently used
    this.map.delete(key)
    this.map.set(key, e)
    return e.value
  }

  /** Set a value with optional per-call TTL override. Promotes recency. */
  set(key: K, value: V, ttlMs = this.defaultTtlMs): void {
    const entry: Entry<V> = { value, expiresAt: Date.now() + ttlMs }
    if (this.map.has(key)) {
      this.map.delete(key)
    } // keep size accounting simple
    this.map.set(key, entry)
    this.enforceLimits()
  }

  /** Check presence without promoting; drops if expired. */
  has(key: K): boolean {
    const e = this.map.get(key)
    if (!e) {
      return false
    }
    if (this.isExpired(e)) {
      this.map.delete(key)
      return false
    }
    return true
  }

  delete(key: K): boolean {
    return this.map.delete(key)
  }

  clear(): void {
    this.map.clear()
  }

  /** Number of *stored* entries (may include expired ones until touched). */
  get size(): number {
    return this.map.size
  }

  /** Optional: run occasionally to trim expired without access. */
  pruneExpired(maxToScan = Math.ceil(this.map.size / 4)): number {
    let removed = 0
    if (this.map.size === 0) {
      return removed
    }
    // Scan from oldest -> newest
    const it = this.map[Symbol.iterator]()
    for (let i = 0; i < maxToScan; i++) {
      const n = it.next()
      if (n.done) {
        break
      }
      const [k, e] = n.value
      if (this.isExpired(e)) {
        this.map.delete(k)
        removed++
      }
    }
    return removed
  }

  /** Iterate non-expired entries, promoting nothing. */
  *entries(): IterableIterator<[K, V]> {
    for (const [k, e] of this.map) {
      if (!this.isExpired(e)) {
        yield [k, e.value]
      }
    }
  }

  private isExpired(e: Entry<V>): boolean {
    return e.expiresAt <= Date.now()
  }

  /** Evict expired first, then strict LRU until size <= maxSize. */
  private enforceLimits(): void {
    if (this.map.size <= this.maxSize) {
      return
    }

    // First pass: drop expired, scanning from oldest
    for (const [k, e] of this.map) {
      if (!this.isExpired(e)) {
        continue
      }
      this.map.delete(k)
      if (this.map.size <= this.maxSize) {
        return
      }
    }

    // Second pass: strict LRU eviction (oldest first) until within bounds
    while (this.map.size > this.maxSize) {
      const oldestKey = this.map.keys().next().value
      if (oldestKey === undefined) {
        break
      }
      this.map.delete(oldestKey)
    }
  }
}

// updated on incoming auth udpate message
let _api: LombokApiClient | undefined

const clientPost: LombokApiClient['POST'] = async (url, ...init) => {
  let attempts = 0
  while (!_api && attempts < 10) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (_api) {
      break
    } else {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    attempts++
  }
  if (!_api) {
    throw new Error('Failed to get api client')
  }
  return _api.POST(url, ...init)
}

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

const recentlyRequestedDownloadUrls = new LruTtlCache<
  string,
  {
    callbacks: {
      resolve?: (url: string) => void
      reject?: (e: unknown) => void
    }
    promise: Promise<string>
  }
>(10000, 3000 * 1000)

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
    // more than 1s since the last batch fetch. Executing now...
    const toFetch = folderBatch.batchBuffer.splice(
      0,
      folderBatch.batchBuffer.length,
    )
    folderBatch.lastTimeExecuted = Date.now()
    void clientPost('/api/v1/folders/{folderId}/presigned-urls', {
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
            const entry = recentlyRequestedDownloadUrls.get(
              `${folderId}:${toFetch[i]}`,
            )
            if (entry?.callbacks.resolve) {
              entry.callbacks.resolve(result)
            }
          })
        }
      })
      .catch((e) => {
        toFetch.forEach((k) => {
          const entry = recentlyRequestedDownloadUrls.get(`${folderId}:${k}`)
          if (entry) {
            recentlyRequestedDownloadUrls.delete(`${folderId}:${k}`)
            entry.callbacks.reject?.(e)
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

  const callbacks: {
    resolve?: (url: string) => void
    reject?: (e: unknown) => void
  } = {}
  const entry: {
    promise: Promise<string>
    callbacks: {
      resolve?: (url: string) => void
      reject?: (e: unknown) => void
    }
  } = {
    callbacks,
    promise: new Promise<string>((resolve, reject) => {
      callbacks.resolve = resolve
      callbacks.reject = reject
    }),
  }
  recentlyRequestedDownloadUrls.set(folderObjectKey, entry)

  maybeSendBatch(folderId)
}

setInterval(() => {
  for (const folderId of Object.keys(presignedURLBufferContext)) {
    maybeSendBatch(folderId)
  }
}, 100)

const getPresignedDownloadUrl = async (
  folderId: string,
  objectIdentifier: string,
) => {
  const folderObjectKey = `${folderId}:${objectIdentifier}`
  if (!recentlyRequestedDownloadUrls.has(folderObjectKey)) {
    requestDownloadUrlAndMaybeSendBatch(folderId, objectIdentifier)
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
  return recentlyRequestedDownloadUrls.get(folderObjectKey)?.promise!
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
    void clientPost('/api/v1/folders/{folderId}/presigned-urls', {
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
        await clientPost(
          '/api/v1/folders/{folderId}/objects/{objectKey}/refresh',
          {
            params: {
              path: {
                folderId,
                objectKey: encodeS3ObjectKey(
                  objectIdentifierToObjectKey(objectIdentifier).objectKey,
                ),
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
  } else if (message[0] === 'GET_PRESIGNED_DOWNLOAD_URL') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const folderId = message[1].folderId as string
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const objectIdentifier = message[1].objectIdentifier as string
    void getPresignedDownloadUrl(folderId, objectIdentifier).then((url) => {
      postMessage([
        'GOT_PRESIGNED_DOWNLOAD_URL',
        {
          folderId,
          objectIdentifier,
          url,
        },
      ])
    })
  } else if (message[0] === 'AUTH_UPDATED') {
    _api = createFetchClient<paths>({
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
