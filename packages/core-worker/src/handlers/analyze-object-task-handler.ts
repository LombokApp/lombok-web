import type { MetadataEntry } from '@stellariscloud/types'
import { MediaType } from '@stellariscloud/types'
import { mediaTypeFromMimeType } from '@stellariscloud/utils'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { v4 as uuidV4 } from 'uuid'

import type {
  CoreServerMessageInterface,
  AppTask,
} from '../utils/connect-app-worker.util'
import { AppAPIError } from '../utils/connect-app-worker.util'
import type {
  ImageOperationOutput,
  VideoOperationOutput,
} from '../utils/ffmpeg.util'
import {
  getNecessaryContentRotation,
  resizeContent,
} from '../utils/ffmpeg.util'
import {
  downloadFileToDisk,
  hashLocalFile,
  uploadFile,
} from '../utils/file.util'

export const analyzeObjectTaskHandler = async (
  task: AppTask,
  server: CoreServerMessageInterface,
) => {
  // console.log('Starting work for task:', task)
  if (!task.id) {
    throw new AppAPIError('INVALID_TASK', 'Missing task id.')
  }

  if (!task.data.folderId) {
    throw new AppAPIError('INVALID_TASK', 'Missing folderId.')
  }

  if (!task.data.objectKey) {
    throw new AppAPIError('INVALID_TASK', 'Missing objectKey.')
  }

  const response = await server.getContentSignedUrls(
    [
      {
        folderId: task.data.folderId,
        objectKey: task.data.objectKey,
        method: 'GET',
      },
    ],
    task.id,
  )

  if (response.error) {
    throw new AppAPIError(response.error.code, response.error.message)
  }

  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `stellaris_task_${task.id}_`),
  )

  const fileUUID = uuidV4()
  const inFilepath = path.join(tempDir, fileUUID)

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir)
  }
  let mimeType = ''
  try {
    const downloadResult = await downloadFileToDisk(
      response.result.urls[0].url,
      inFilepath,
    )
    mimeType = downloadResult.mimeType
    if (!mimeType) {
      throw new AppAPIError(
        'UNRECOGNIZED_MIME_TYPE',
        `Cannot resolve mimeType for objectKey ${task.data.objectKey}`,
      )
    }
  } catch (e: unknown) {
    throw new AppAPIError(
      'STORAGE_ACCESS_FAILURE',
      `Failure accessing underlying storage: ${JSON.stringify(task.data)}`,
    )
    throw e
  }

  const mediaType = mediaTypeFromMimeType(mimeType)
  const [outMimeType, outExtension] =
    mediaType === MediaType.Image
      ? ['image/webp', 'webp']
      : ['video/webm', 'webm']

  let scaleResult: VideoOperationOutput | ImageOperationOutput | undefined
  let metadataDescription: { [key: string]: MetadataEntry } = {}
  const contentHash = await hashLocalFile(inFilepath)
  const rotation = await getNecessaryContentRotation(inFilepath, mimeType)
  if ([MediaType.Image, MediaType.Video].includes(mediaType)) {
    const compressedOutFilePath = path.join(tempDir, `comp.${outExtension}`)
    const smThumbnailOutFilePath = path.join(tempDir, `sm.${outExtension}`)
    const lgThumbnailOutFilePath = path.join(tempDir, `md.${outExtension}`)

    scaleResult = await resizeContent({
      inFilepath,
      outFilepath: compressedOutFilePath,
      mimeType,
      maxDimension: 2000,
      rotation,
    })

    await resizeContent({
      inFilepath,
      outFilepath: lgThumbnailOutFilePath,
      mimeType,
      maxDimension: 500,
      rotation,
    })
    await resizeContent({
      inFilepath,
      outFilepath: smThumbnailOutFilePath,
      mimeType,
      maxDimension: 150,
      rotation,
    })

    // get the upload URLs for the metadata files
    const metadataHashes = {
      compressedVersion: await hashLocalFile(compressedOutFilePath),
      thumbnailSm: await hashLocalFile(smThumbnailOutFilePath),
      thumbnailLg: await hashLocalFile(lgThumbnailOutFilePath),
    }
    // console.log('metadataHashes:', metadataHashes)

    const metadataKeys = Object.keys(metadataHashes)
    const metadtaSignedUrlsResponse = await server
      .getMetadataSignedUrls(
        metadataKeys.map((k) => ({
          folderId: task.data.folderId,
          contentHash,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          objectKey: task.data.objectKey!,
          method: 'PUT',
          metadataHash: metadataHashes[k as keyof typeof metadataHashes],
        })),
      )
      .then(({ result, error }) => {
        if (error) {
          throw new AppAPIError(error.code, error.message)
        }
        return result.urls.reduce<typeof metadataHashes>(
          (acc, next, i) => {
            return {
              ...acc,
              [metadataKeys[i]]: next.url,
            }
          },
          {
            compressedVersion: '',
            thumbnailSm: '',
            thumbnailLg: '',
          },
        )
      })

    metadataDescription = {
      compressedVersion: {
        hash: metadataHashes.compressedVersion,
        mimeType: outMimeType,
        size: fs.statSync(compressedOutFilePath).size,
        storageKey: metadataHashes.compressedVersion,
        content: '',
      },
      thumbnailLg: {
        hash: metadataHashes.thumbnailLg,
        mimeType: outMimeType,
        size: fs.statSync(lgThumbnailOutFilePath).size,
        storageKey: metadataHashes.thumbnailLg,
        content: '',
      },
      thumbnailSm: {
        hash: metadataHashes.thumbnailSm,
        mimeType: outMimeType,
        size: fs.statSync(smThumbnailOutFilePath).size,
        storageKey: metadataHashes.thumbnailSm,
        content: '',
      },
      mimeType: {
        size: Buffer.from(mimeType).length,
        hash: '',
        storageKey: '',
        content: mimeType,
        mimeType: 'text/plain',
      },
      mediaType: {
        size: Buffer.from(mediaType).length,
        hash: '',
        storageKey: '',
        content: mediaType,
        mimeType: 'text/plain',
      },
      height: {
        size: Buffer.from(JSON.stringify(scaleResult?.originalHeight ?? 0))
          .length,
        hash: '',
        storageKey: '',
        content: `${scaleResult?.originalHeight ?? 0}`,
        mimeType: 'application/json',
      },
      width: {
        size: Buffer.from(JSON.stringify(scaleResult?.originalWidth ?? 0))
          .length,
        hash: '',
        storageKey: '',
        content: `${scaleResult?.originalWidth ?? 0}`,
        mimeType: 'application/json',
      },
      orientation: {
        size: Buffer.from(JSON.stringify(rotation ?? 0)).length,
        hash: '',
        storageKey: '',
        content: `${rotation ?? 0}`,
        mimeType: 'application/json',
      },
      lengthMs: {
        size: Buffer.from(
          JSON.stringify((scaleResult as any | undefined)?.lengthMs ?? 0),
        ).length,
        hash: '',
        storageKey: '',
        content: `${(scaleResult as any | undefined)?.lengthMs ?? 0}`,
        mimeType: 'application/json',
      },
    }

    await uploadFile(
      compressedOutFilePath,
      metadtaSignedUrlsResponse.compressedVersion,
      outMimeType,
    )

    await uploadFile(
      lgThumbnailOutFilePath,
      metadtaSignedUrlsResponse.thumbnailLg,
      outMimeType,
    )

    await uploadFile(
      smThumbnailOutFilePath,
      metadtaSignedUrlsResponse.thumbnailSm,
      outMimeType,
    )
  }

  const metadataUpdateResponse = await server.updateContentMetadata(
    [
      {
        folderId: task.data.folderId,
        objectKey: task.data.objectKey,
        hash: contentHash,
        metadata: metadataDescription,
      },
    ],
    task.id,
  )

  if (metadataUpdateResponse.error) {
    throw new AppAPIError(
      metadataUpdateResponse.error.code,
      metadataUpdateResponse.error.message,
    )
  }

  // remove the temporary directory
  for (const f of fs.readdirSync(tempDir)) {
    fs.rmSync(path.join(tempDir, f))
  }
  fs.rmdirSync(tempDir)
}
