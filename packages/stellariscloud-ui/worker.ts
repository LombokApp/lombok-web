import { FoldersApi } from '@stellariscloud/api-client'
import { bindApiConfig } from '@stellariscloud/auth-utils'
import { SignedURLsRequestMethod } from '@stellariscloud/types'
import { objectIdentifierToObjectKey } from '@stellariscloud/utils'
import axios from 'axios'

import { LogLevel } from './contexts/logging.context'
import { indexedDb } from './services/indexed-db'
import { addFileToLocalFileStorage } from './services/local-cache/local-cache.service'

const downloading: { [key: string]: { progressPercent: number } | undefined } =
  {}

// we receive the token updates from the main thread so here we just use the latest reference
let accessToken = ''
const defaultConfig = {
  basePath: process.env.NEXT_PUBLIC_API_BASE_URL,
  accessToken: () => accessToken,
}

const foldersApi = bindApiConfig(defaultConfig, FoldersApi)()

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
  return !!(await indexedDb?.getMetadata(`${folderId}:${objectIdentifier}`))
    ?.result
}

const recentlyRequested: {
  [key: string]:
    | {
        callbacks?: { resolve: (url: string) => void; reject: (e: any) => void }
        promise?: Promise<string>
      }
    | undefined
} = {}

const presignedURLBufferContext: {
  [folderId: string]: {
    batchBuffer: string[]
    lastTimeExecuted?: number
  }
} = {}

const maybeSendBatch = (folderId: string) => {
  const folderBatch =
    folderId in presignedURLBufferContext
      ? presignedURLBufferContext[folderId]
      : { batchBuffer: [], lastTimeExecuted: Date.now() }
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
    void foldersApi
      .createPresignedUrls({
        folderId,
        folderCreateSignedUrlInputDTOInner: toFetch.map((k) => ({
          method: SignedURLsRequestMethod.GET,
          objectIdentifier: k,
        })),
      })
      .then((response) => {
        response.data.urls.forEach((result, i) => {
          const entry = recentlyRequested[`${folderId}:${toFetch[i]}`]
          if (entry?.callbacks?.resolve) {
            entry.callbacks.resolve(result)
          }
          setTimeout(() => {
            recentlyRequested[`${folderId}:${toFetch[i]}`] = undefined
          }, 10000)
        })
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
  const folderBatch =
    folderId in presignedURLBufferContext
      ? presignedURLBufferContext[folderId]
      : { batchBuffer: [], lastTimeExecuted: Date.now() }
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
    await axios
      .get(downloadURL, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total ?? 0),
          )
          // console.log('download progress... %d%', percentCompleted)
          downloading[folderIdAndKey] = { progressPercent: percentCompleted }
        },
      })
      .then((response) => {
        // console.log('COMPLETED download...')
        log({
          level: LogLevel.INFO,
          folderId,
          objectIdentifier,
          message: `Downloaded '${objectIdentifier}'`,
        })

        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete downloading[folderIdAndKey]
        return addFileToLocalFileStorage(
          folderId,
          objectIdentifier,
          response.data as Blob,
        )
      })
      .catch((e) => {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete downloading[folderIdAndKey]
        log({
          level: LogLevel.ERROR,
          folderId,
          objectIdentifier,
          message: `Error downloading '${objectIdentifier}'`,
        })
        throw e
      })
    return true
  }
  return false
}

const messageHandler = (event: MessageEvent<AsyncWorkerMessage>) => {
  const message = event.data
  // console.log('WORKER event.data', event.data)
  if (message[0] === 'UPLOAD') {
    const folderId: string = message[1].folderId
    const objectIdentifier: string = message[1].objectIdentifier
    log({
      level: LogLevel.INFO,
      folderId,
      objectIdentifier,
      message: `Upload of '${objectIdentifier}' started`,
    })
    const uploadFile: File = message[1].uploadFile
    void foldersApi
      .createPresignedUrls({
        folderId,
        folderCreateSignedUrlInputDTOInner: [
          {
            objectIdentifier,
            method: SignedURLsRequestMethod.PUT,
          },
        ],
      })
      .then((response) => response.data)
      .then(async ({ urls: [uploadSlot] }) => {
        await axios.put(uploadSlot, uploadFile, {
          headers: {
            'Content-Type': uploadFile.type,
            'Content-Encoding': 'base64',
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total ?? 0),
            )
            postMessage([
              'UPLOAD_PROGRESS',
              {
                progress: percentCompleted,
                objectKey: uploadFile.name,
              },
            ])
          },
        })

        // have the app ingest the file
        await foldersApi.refreshFolderObjectS3Metadata({
          folderId,
          objectKey: objectIdentifierToObjectKey(objectIdentifier).objectKey,
        })

        log({
          level: LogLevel.INFO,
          folderId,
          objectIdentifier,
          message: `Upload of '${objectIdentifier}' complete`,
        })
      })
  } else if (message[0] === 'DOWNLOAD') {
    const folderIdAndKey = `${message[1].folderId}:${message[1].objectIdentifier}`
    void downloadLocally(
      message[1].folderId as string,
      message[1].objectIdentifier as string,
    )
      .then(() => {
        postMessage([
          'DOWNLOAD_COMPLETED',
          {
            folderId: message[1].folderId,
            objectIdentifier: message[1].objectIdentifier,
          },
        ])
      })
      .catch((e) => {
        console.log('DOWNLOAD ERROR:', e)
        postMessage([
          'DOWNLOAD_FAILED',
          {
            folderId: message[1].folderId,
            objectIdentifier: message[1].objectIdentifier,
          },
        ])
      })
      .finally(() => {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete downloading[folderIdAndKey]
      })
  } else if (message[0] === 'AUTH_UPDATED') {
    accessToken = message[1]
  }
}

self.addEventListener('message', (m) =>
  messageHandler(m as MessageEvent<AsyncWorkerMessage>),
)

export {}
