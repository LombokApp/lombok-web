import type { FolderObjectContentMetadata } from '@stellariscloud/api-client'
import { FoldersApi, MediaType } from '@stellariscloud/api-client'
import { bindApiConfig } from '@stellariscloud/api-utils'
import type { AsyncOperation } from '@stellariscloud/types'
import { AsyncOpType } from '@stellariscloud/types'
import { mediaTypeFromMimeType } from '@stellariscloud/utils'
import axios from 'axios'
import blobToHash from 'blob-to-hash'

import { LogLevel } from './contexts/logging.context'
import { indexedDb } from './services/indexed-db'
import {
  addFileToLocalFileStorage,
  getDataFromDisk,
} from './services/local-cache/local-cache.service'
import { FFmpegWrapper } from './utils/ffmpeg'
import {
  CropType,
  generatePreviewsWithFFmpeg,
  getExifTagsFromImage,
} from './utils/image'

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
  objectKey?: string
}) => {
  // console.log('logMessage:', logMessage)
  postMessage(['LOG_MESSAGE', logMessage])
}

const isLocal = async (folderId: string, objectKey: string) => {
  return !!(await indexedDb?.getMetadata(`${folderId}:${objectKey}`))?.result
}

let host = ''
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

const requestDownloadURLAndMaybeSendBatch = (
  folderId: string,
  objectKey?: string,
) => {
  const folderObjectKey = `${folderId}:${objectKey}`
  const folderBatch =
    folderId in presignedURLBufferContext
      ? presignedURLBufferContext[folderId]
      : { batchBuffer: [], lastTimeExecuted: Date.now() }
  presignedURLBufferContext[folderId] = folderBatch
  if (objectKey) {
    presignedURLBufferContext[folderId].batchBuffer.push(objectKey)
    if (presignedURLBufferContext[folderId].batchBuffer.length === 1) {
      presignedURLBufferContext[folderId].lastTimeExecuted = Date.now()
    }
  }

  recentlyRequested[folderObjectKey] = {}
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  recentlyRequested[folderObjectKey]!.promise = new Promise<string>(
    (resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      recentlyRequested[folderObjectKey]!.callbacks = { resolve, reject }
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
          .createPresignedURLs({
            folderId,
            requestBody: toFetch.map((k) => ({
              method: 'GET',
              objectKey: k,
            })),
          })
          .then((response) => {
            response.data.forEach((result) => {
              const entry = recentlyRequested[`${folderId}:${result.objectKey}`]
              if (entry?.callbacks?.resolve) {
                entry.callbacks.resolve(result.url)
              }
              setTimeout(() => {
                recentlyRequested[`${folderId}:${result.objectKey}`] = undefined
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
    },
  )
}

setInterval(() => {
  for (const folderId of Object.keys(presignedURLBufferContext)) {
    requestDownloadURLAndMaybeSendBatch(folderId)
  }
}, 100)

const getDownloadURL = async (folderId: string, objectKey: string) => {
  const folderObjectKey = `${folderId}:${objectKey}`
  if (!(folderObjectKey in recentlyRequested)) {
    requestDownloadURLAndMaybeSendBatch(folderId, objectKey)
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return recentlyRequested[folderObjectKey]?.promise!
}

const downloadLocally = async (
  folderId: string,
  objectKey: string,
): Promise<boolean> => {
  const folderIdAndKey = `${folderId}:${objectKey}`
  // console.log('starting to download...')
  const isDataLocal = await isLocal(folderId, objectKey)
  // console.log(`isDataLocal[${objectKey}]:`, isDataLocal)
  if (!isDataLocal && !downloading[folderIdAndKey]) {
    downloading[folderIdAndKey] = { progressPercent: 0 }
    const downloadURL = await getDownloadURL(folderId, objectKey)
    // console.log('about to start download:', downloadURL)
    log({
      level: LogLevel.INFO,
      folderId,
      objectKey,
      message: `Downloading '${objectKey}' ...`,
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
          objectKey,
          message: `Downloaded '${objectKey}'`,
        })

        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete downloading[folderIdAndKey]
        return addFileToLocalFileStorage(
          folderId,
          objectKey,
          response.data as Blob,
        )
      })
      .catch((e) => {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete downloading[folderIdAndKey]
        log({
          level: LogLevel.ERROR,
          folderId,
          objectKey,
          message: `Error downloading '${objectKey}'`,
        })
        throw e
      })
    return true
  }
  return false
}

const generateObjectPreviews = async (folderId: string, objectKey: string) => {
  log({
    level: LogLevel.INFO,
    folderId,
    objectKey,
    message: `Indexing content for '${objectKey}'`,
  })
  const fileIsLocal = await isLocal(folderId, objectKey)
  if (!fileIsLocal) {
    await downloadLocally(folderId, objectKey)
  }
  const data = await getDataFromDisk(folderId, objectKey)
  const blob = data
    ? new Blob([Buffer.from(data.dataURL, 'base64')], { type: data.type })
    : undefined
  if (!blob) {
    log({
      level: LogLevel.ERROR,
      folderId,
      objectKey,
      message: `Could not load '${objectKey}' from disk`,
    })

    throw new Error(
      `Failure loading file '${folderId}:${objectKey}' from disk.`,
    )
  }
  const metadata: FolderObjectContentMetadata = {
    hash: await blobToHash('sha256', blob),
    mimeType: blob.type,
    lengthMilliseconds: 0,
    height: 0,
    width: 0,
    previews: {},
  }
  let metadataFiles: ({ blob: Blob; key: string } | undefined)[] = []
  const ffmpeg = new FFmpegWrapper({
    log: true,
    corePath: `/ffmpeg-core/ffmpeg-core.js`,
    progress: (p) => console.log('ffmpeg progress:', p),
  })
  await ffmpeg.load(host)
  if (mediaTypeFromMimeType(metadata.mimeType) === MediaType.Image) {
    // get the dimensions using ffmpeg
    const initialDimensions = await ffmpeg.getMediaDimensions(blob)
    metadata.height = initialDimensions.height
    metadata.width = initialDimensions.width

    // load Exif tags into content metadata (jpeg only)
    const exifTags =
      metadata.mimeType === 'image/jpeg'
        ? await getExifTagsFromImage(blob)
        : undefined

    // generate previews using ffmpeg, and accouting for the "Orientation" exif tag
    const imageOrientation =
      exifTags && 'Orientation' in exifTags
        ? parseInt(exifTags['Orientation'], 10)
        : undefined
    metadata.imageOrientation = imageOrientation
    metadataFiles = (
      await generatePreviewsWithFFmpeg(ffmpeg, blob, [
        {
          crop: { cropType: CropType.NONE },
          maxSize: 2000,
          imageOrientation,
          quality: 1,
          outputExtension: 'webp',
        },
        {
          crop: { cropType: CropType.NONE },
          maxSize: 500,
          imageOrientation,
          quality: 1,
          outputExtension: 'webp',
        },
        {
          crop: { cropType: CropType.NONE },
          maxSize: 150,
          imageOrientation,
          quality: 1,
          outputExtension: 'webp',
        },
      ])
    ).map((resized, i) => {
      return resized
        ? {
            ...resized,
            key: `${i === 0 ? 'large' : i === 1 ? 'medium' : 'small'}.webp`,
          }
        : resized
    })
    if (metadataFiles[0] && metadataFiles[1] && metadataFiles[2]) {
      metadata.previews = {
        large: {
          path: metadataFiles[0].key,
          size: metadataFiles[0].blob.size,
        },
        medium: {
          path: metadataFiles[1].key,
          size: metadataFiles[1].blob.size,
        },
        small: {
          path: metadataFiles[2].key,
          size: metadataFiles[2].blob.size,
        },
      }
    } else {
      log({
        level: LogLevel.ERROR,
        folderId,
        objectKey,
        message: `Content indexing failed for '${objectKey}' (preview file generation failed)`,
      })
    }
    const successful = metadataFiles.filter((thumbnail) => !!thumbnail) as {
      blob: Blob
      key: string
    }[]

    const uploadURLsResponse = await foldersApi.createPresignedURLs({
      folderId,
      requestBody: successful.map((k) => ({
        method: 'PUT',
        objectKey: `${objectKey}____previews/${k.key}`,
      })),
    })

    for (const f of successful) {
      const previewObjectKey = `${objectKey}____previews/${f.key}`
      const uploadSlot = uploadURLsResponse.data.find(
        (slot) => slot.objectKey === previewObjectKey,
      )
      if (uploadSlot) {
        await axios.put(uploadSlot.url, f.blob, {
          headers: {
            'Content-Type': blob.type,
            'Content-Encoding': 'base64',
          },
        })
        await addFileToLocalFileStorage(folderId, previewObjectKey, f.blob)
      } else {
        throw new Error('Failed to get metadata files upload URLs.')
      }
    }
  } else if (mediaTypeFromMimeType(metadata.mimeType) === MediaType.Video) {
    const initialDimensions = await ffmpeg.getMediaDimensions(blob)
    metadata.lengthMilliseconds = initialDimensions.lengthMilliseconds ?? 0
    metadata.height = initialDimensions.height
    metadata.width = initialDimensions.width
    metadataFiles = (
      await generatePreviewsWithFFmpeg(ffmpeg, blob, [
        {
          maxSize: 480,
          crop: { cropType: CropType.NONE },
          quality: 1,
          outputExtension: 'webm',
        },
        {
          maxSize: 250,
          crop: { cropType: CropType.NONE },
          quality: 1,
          outputExtension: 'webm',
        },
        {
          maxSize: 100,
          crop: { cropType: CropType.NONE },
          quality: 1,
          outputExtension: 'webm',
        },
      ])
    ).map((resized, i) => {
      return resized
        ? {
            ...resized,
            key: `${i === 0 ? 'large' : i === 1 ? 'medium' : 'small'}.webm`,
          }
        : resized
    })

    if (metadataFiles[0] && metadataFiles[1] && metadataFiles[2]) {
      metadata.previews = {
        large: {
          path: metadataFiles[0].key,
          size: metadataFiles[0].blob.size,
        },
        medium: {
          path: metadataFiles[1].key,
          size: metadataFiles[1].blob.size,
        },
        small: {
          path: metadataFiles[2].key,
          size: metadataFiles[2].blob.size,
        },
      }
    }
    const successful = metadataFiles.filter((thumbnail) => !!thumbnail) as {
      blob: Blob
      key: string
    }[]
    const uploadURLsResponse = await foldersApi.createPresignedURLs({
      folderId,
      requestBody: successful.map(({ key }) => ({
        objectKey: `${objectKey}____previews/${key}`,
        method: 'PUT',
      })),
    })

    for (const f of successful) {
      const previewObjectKey = `${objectKey}____previews/${f.key}`
      const uploadSlot = uploadURLsResponse.data.find(
        (slot) => slot.objectKey === previewObjectKey,
      )
      if (uploadSlot) {
        await axios.put(uploadSlot.url, f.blob, {
          headers: {
            'Content-Type': blob.type,
            'Content-Encoding': 'base64',
          },
        })
        await addFileToLocalFileStorage(folderId, previewObjectKey, f.blob)
      } else {
        log({
          level: LogLevel.ERROR,
          folderId,
          objectKey,
          message: `Failed fetching upload URLs for preview files of '${objectKey}'`,
        })
      }
    }
  }
  await foldersApi.updateFolderObjectContentMetadata({
    folderId,
    objectKey,
    folderObjectContentMetadata: metadata,
  })
  log({
    level: LogLevel.INFO,
    folderId,
    objectKey,
    message: `Completed content indexing for '${objectKey}'`,
  })
  ffmpeg.exit()
  return metadata
}

const messageHandler = (event: MessageEvent<AsyncWorkerMessage>) => {
  const message = event.data
  // console.log('WORKER event.data', event.data)
  if (message[0] === 'UPLOAD') {
    const folderId: string = message[1].folderId
    const objectKey: string = message[1].objectKey
    log({
      level: LogLevel.INFO,
      folderId,
      objectKey,
      message: `Upload of '${objectKey}' started`,
    })
    const uploadFile: File = message[1].uploadFile
    void foldersApi
      .createPresignedURLs({
        folderId,
        requestBody: [{ objectKey, method: 'PUT' }],
      })
      .then((response) => response.data)
      .then(async ([uploadSlot]) => {
        // console.log('UPLOAD: got upload url for', uploadSlot.objectKey)
        const uploadResponse = await axios.put(uploadSlot.url, uploadFile, {
          headers: {
            'Content-Type': uploadFile.type,
            'Content-Encoding': 'base64',
          },
        })
        await addFileToLocalFileStorage(folderId, uploadFile.name, uploadFile)
        await foldersApi.refreshFolderObjectS3Metadata({
          folderId,
          objectKey,
          inlineObject1: {
            eTag: uploadResponse.headers['etag'],
          },
        })
        await foldersApi.updateFolderObjectContentMetadata({
          folderId,
          objectKey,
          folderObjectContentMetadata: {
            hash: await blobToHash('sha256', uploadFile),
            mimeType: uploadFile.type,
            lengthMilliseconds: 0,
            previews: {},
            height: 0,
            width: 0,
          },
        })
        log({
          level: LogLevel.INFO,
          folderId,
          objectKey,
          message: `Upload of '${objectKey}' complete`,
        })
      })
  } else if (message[0] === 'DOWNLOAD') {
    const folderIdAndKey = `${message[1].folderId}:${message[1].objectKey}`
    void downloadLocally(
      message[1].folderId as string,
      message[1].objectKey as string,
    )
      .then(() => {
        postMessage([
          'DOWNLOAD_COMPLETED',
          {
            folderId: message[1].folderId,
            objectKey: message[1].objectKey,
          },
        ])
      })
      .catch((e) => {
        console.log(e)
        postMessage([
          'DOWNLOAD_FAILED',
          {
            folderId: message[1].folderId,
            objectKey: message[1].objectKey,
          },
        ])
      })
      .finally(() => {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete downloading[folderIdAndKey]
      })
  } else if (message[0] === 'OPERATION') {
    const operation: AsyncOperation = message[1]
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (operation.opType === AsyncOpType.GENERATE_OBJECT_PREVIEWS) {
      const { id, inputs /*, config*/ } = operation
      // for this operation, there is a single input file
      const { folderId, objectKey } = inputs[0]
      // console.log('GENERATE_OBJECT_PREVIEWS', { folderId, objectKey })
      log({
        level: LogLevel.INFO,
        folderId,
        objectKey,
        message: `Preview generation of '${objectKey}' started`,
      })
      void generateObjectPreviews(folderId, objectKey)
        .then((metadata) => {
          postMessage([
            'OPERATION_COMPLETED',
            id,
            {
              metadata,
            },
          ])
        })
        .catch((e) => {
          console.log('Worker error:', e)
          postMessage(['OPERATION_FAILED', id])
        })
    }
  } else if (message[0] === 'AUTH_UPDATED') {
    accessToken = message[1]
  } else if (message[0] === 'INIT') {
    accessToken = message[1].accessToken
    host = message[1].host
  }
}

self.addEventListener('message', (m) =>
  messageHandler(m as MessageEvent<AsyncWorkerMessage>),
)

export {}
