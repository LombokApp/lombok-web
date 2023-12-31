import type { MetadataEntry } from '@stellariscloud/types'
import { MediaType } from '@stellariscloud/types'
import { mediaTypeFromMimeType } from '@stellariscloud/utils'
import fs from 'fs'
import os from 'os'
import path from 'path'

import type {
  CoreServerMessageInterface,
  ModuleEvent,
} from '../utils/connect-module-worker.util'
import { ModuleAPIError } from '../utils/connect-module-worker.util'
import type { FFMpegOutput } from '../utils/ffmpeg.util'
import { resizeWithFFmpeg } from '../utils/ffmpeg.util'
import {
  downloadFileToDisk,
  hashLocalFile,
  streamUploadFile,
} from '../utils/file.util'

export const objectAddedEventHandler = async (
  event: ModuleEvent,
  server: CoreServerMessageInterface,
) => {
  console.log('Starting work for event:', event)
  if (!event.id) {
    throw new ModuleAPIError('INVALID_EVENT', 'Missing event id.')
  }

  if (!event.data.objectKey) {
    throw new ModuleAPIError('INVALID_EVENT', 'Missing objectKey.')
  }

  if (!event.data.folderId) {
    throw new ModuleAPIError('INVALID_EVENT', 'Missing folderId.')
  }

  const response = await server.getContentSignedUrls(
    [
      {
        folderId: event.data.folderId,
        objectKey: event.data.objectKey,
        method: 'GET',
      },
    ],
    event.id,
  )

  if (response.error) {
    throw new ModuleAPIError(response.error.code, response.error.message)
  }

  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `stellaris_event_${event.id}_`),
  )

  const inFilepath = path.join(tempDir, event.data.objectKey as string)

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir)
  }
  const { mimeType } = await downloadFileToDisk(
    response.result.urls[0].url,
    inFilepath,
    event.data.objectKey as string,
  )

  if (!mimeType) {
    throw new ModuleAPIError(
      'UNRECOGNIZED_MIME_TYPE',
      `Cannot resolve mimeType for objectKey ${event.data.objectKey}`,
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
          folderId: event.data.folderId,
          contentHash,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          objectKey: event.data.objectKey!,
          method: 'PUT',
          metadataHash: metadataHashes[k as keyof typeof metadataHashes],
        })),
        event.id,
      )
      .then(({ result, error }) => {
        if (error) {
          throw new ModuleAPIError(error.code, error.message)
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
        folderId: event.data.folderId,
        objectKey: event.data.objectKey,
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
    event.id,
  )

  if (updateContentAttributesResponse.error) {
    throw new ModuleAPIError('UPDATE_CONTENT_ATTRIBUTES_FAILED')
  }

  const metadataUpdateResponse = await server.updateContentMetadata(
    [
      {
        folderId: event.data.folderId,
        objectKey: event.data.objectKey,
        hash: contentHash,
        metadata: metadataDescription,
      },
    ],
    event.id,
  )

  if (metadataUpdateResponse.error) {
    throw new ModuleAPIError('UPDATE_CONTENT_METADATA_FAILED')
  }

  // remove the temporary directory
  for (const f of fs.readdirSync(tempDir)) {
    fs.rmSync(path.join(tempDir, f))
  }
  fs.rmdirSync(tempDir)
}
