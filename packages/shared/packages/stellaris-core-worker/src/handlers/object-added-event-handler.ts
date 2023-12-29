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
  console.log('Got event:', event)
  if (!event.id) {
    throw new Error('No event id!')
  }

  if (!event.data.objectKey) {
    throw new Error('objectKey should not be null for this event')
  }

  console.log('handling event [%s]:', event.id, event.data)
  const [downloadUrl] = await server.getSignedUrls([
    {
      folderId: event.data.folderId,
      objectKey: event.data.objectKey,
      method: 'GET',
    },
  ])
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `stellaris_event_${event.id}_`),
  )

  const inFilepath = path.join(tempDir, event.data.objectKey)

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir)
  }

  const { mimeType } = await downloadFileToDisk(
    downloadUrl,
    inFilepath,
    event.data.objectKey,
  )

  if (!mimeType) {
    throw new Error(
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
    const uploadUrls = await server
      .getMetadataSignedUrls(
        event.id,
        metadataKeys.map((k) => ({
          folderId: event.data.folderId,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          objectKey: event.data.objectKey!,
          method: 'PUT',
          metadataHash: metadataHashes[k as keyof typeof metadataHashes],
        })),
      )
      .then((result) => {
        return result.reduce<typeof metadataHashes>(
          (acc, next, i) => {
            return {
              ...acc,
              [metadataKeys[i]]: next,
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
      uploadUrls.compressedVersion,
      outMimeType,
    )

    await streamUploadFile(
      lgThumbnailOutFilePath,
      uploadUrls.thumbnailLg,
      outMimeType,
    )

    await streamUploadFile(
      smThumbnailOutFilePath,
      uploadUrls.thumbnailSm,
      outMimeType,
    )
  }

  await server.updateContentAttributes([
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
  ])

  await server.updateContentMetadata([
    {
      folderId: event.data.folderId,
      objectKey: event.data.objectKey,
      hash: contentHash,
      metadata: metadataDescription,
    },
  ])

  // remove the temporary directory
  for (const f of fs.readdirSync(tempDir)) {
    fs.rmSync(path.join(tempDir, f))
  }
  fs.rmdirSync(tempDir)
}
