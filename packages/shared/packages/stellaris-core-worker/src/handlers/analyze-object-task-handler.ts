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
import type { FFMpegOutput } from '../utils/ffmpeg.util'
import { resizeWithFFmpeg } from '../utils/ffmpeg.util'
import {
  downloadFileToDisk,
  hashLocalFile,
  streamUploadFile,
} from '../utils/file.util'

export const analyzeObjectTaskHandler = async (
  task: AppTask,
  server: CoreServerMessageInterface,
) => {
  console.log('Starting work for task:', task)
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
  const { mimeType } = await downloadFileToDisk(
    response.result.urls[0].url,
    inFilepath,
  )

  if (!mimeType) {
    throw new AppAPIError(
      'UNRECOGNIZED_MIME_TYPE',
      `Cannot resolve mimeType for objectKey ${task.data.objectKey}`,
    )
  }
  const mediaType = mediaTypeFromMimeType(mimeType)
  const [outMimeType, outExtension] =
    mediaType === MediaType.Image
      ? ['image/webp', 'webp']
      : ['video/webm', 'webm']

  let ffmpegResult: FFMpegOutput | undefined
  let metadataDescription: { [key: string]: MetadataEntry } = {}
  const contentHash = await hashLocalFile(inFilepath)
  if ([MediaType.Image, MediaType.Video].includes(mediaType)) {
    const compressedOutFilePath = path.join(tempDir, `comp.${outExtension}`)
    const smThumbnailOutFilePath = path.join(tempDir, `sm.${outExtension}`)
    const lgThumbnailOutFilePath = path.join(tempDir, `md.${outExtension}`)

    ffmpegResult = await resizeWithFFmpeg(
      inFilepath,
      compressedOutFilePath,
      mimeType,
      2000,
    )
    await resizeWithFFmpeg(inFilepath, lgThumbnailOutFilePath, mimeType, 500)
    await resizeWithFFmpeg(inFilepath, smThumbnailOutFilePath, mimeType, 150)

    // get the upload URLs for the metadata files
    const metadataHashes = {
      compressedVersion: await hashLocalFile(compressedOutFilePath),
      thumbnailSm: await hashLocalFile(smThumbnailOutFilePath),
      thumbnailLg: await hashLocalFile(lgThumbnailOutFilePath),
    }
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
      },
      thumbnailLg: {
        hash: metadataHashes.thumbnailLg,
        mimeType: outMimeType,
        size: fs.statSync(lgThumbnailOutFilePath).size,
      },
      thumbnailSm: {
        hash: metadataHashes.thumbnailSm,
        mimeType: outMimeType,
        size: fs.statSync(smThumbnailOutFilePath).size,
      },
    }

    await streamUploadFile(
      compressedOutFilePath,
      metadtaSignedUrlsResponse.compressedVersion,
      outMimeType,
    )

    await streamUploadFile(
      lgThumbnailOutFilePath,
      metadtaSignedUrlsResponse.thumbnailLg,
      outMimeType,
    )

    await streamUploadFile(
      smThumbnailOutFilePath,
      metadtaSignedUrlsResponse.thumbnailSm,
      outMimeType,
    )
  }

  const updateContentAttributesResponse = await server.updateContentAttributes(
    [
      {
        folderId: task.data.folderId,
        objectKey: task.data.objectKey,
        hash: contentHash,
        attributes: {
          mimeType,
          mediaType: MediaType.Image,
          bitrate: 0,
          height: ffmpegResult?.originalHeight ?? 0,
          width: ffmpegResult?.originalWidth ?? 0,
          lengthMs: ffmpegResult?.lengthMs ?? 0,
          orientation: ffmpegResult?.originalOrientation ?? 0,
        },
      },
    ],
    task.id,
  )

  if (updateContentAttributesResponse.error) {
    throw new AppAPIError('UPDATE_CONTENT_ATTRIBUTES_FAILED')
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
    throw new AppAPIError('UPDATE_CONTENT_METADATA_FAILED')
  }

  // remove the temporary directory
  for (const f of fs.readdirSync(tempDir)) {
    fs.rmSync(path.join(tempDir, f))
  }
  fs.rmdirSync(tempDir)
}
