import type { IAppPlatformService } from '@lombokapp/app-worker-sdk'
import { AppAPIError } from '@lombokapp/app-worker-sdk'
import {
  downloadFileToDisk,
  hashLocalFile,
  readFileMetadata,
  uploadFile,
} from '@lombokapp/core-worker-utils'
import type { taskSchema } from '@lombokapp/types'
import { MediaType, SignedURLsRequestMethod } from '@lombokapp/types'
import { mediaTypeFromMimeType } from '@lombokapp/utils'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { v4 as uuidV4 } from 'uuid'
import type z from 'zod'

import { analyzeContent } from '../analyze/analyze-content'

export const analyzeObjectTaskHandler = async (
  task: z.infer<typeof taskSchema>,
  server: IAppPlatformService,
) => {
  if (!task.id) {
    throw new AppAPIError('INVALID_TASK', 'Missing task id.')
  }
  if (!task.targetLocation?.folderId) {
    throw new AppAPIError('INVALID_TASK', 'Missing folderId.')
  }

  if (!task.targetLocation.objectKey) {
    throw new AppAPIError('INVALID_TASK', 'Missing objectKey.')
  }

  const contentDownloadUrlResponse = await server.getContentSignedUrls([
    {
      folderId: task.targetLocation.folderId,
      objectKey: task.targetLocation.objectKey,
      method: SignedURLsRequestMethod.GET,
    },
  ])
  if ('error' in contentDownloadUrlResponse) {
    throw new AppAPIError(
      contentDownloadUrlResponse.error.code,
      contentDownloadUrlResponse.error.message,
    )
  }

  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), `lombok_task_${task.id}_`),
  )

  const metadataOutFileDirectory = path.join(tempDir, 'metadata')
  await fs.promises.mkdir(metadataOutFileDirectory)

  const fileUUID = uuidV4()
  const inFilePath = path.join(tempDir, fileUUID)

  let mimeType = ''
  try {
    const downloadResult = await downloadFileToDisk(
      contentDownloadUrlResponse.result[0].url,
      inFilePath,
    )
    mimeType = downloadResult.mimeType
    if (!mimeType) {
      throw new AppAPIError(
        'UNRECOGNIZED_MIME_TYPE',
        `Cannot resolve mimeType for objectKey ${task.targetLocation.objectKey}`,
      )
    }
  } catch (e: unknown) {
    throw new AppAPIError(
      'STORAGE_ACCESS_FAILURE',
      `Failure accessing underlying storage: ${JSON.stringify({
        folderId: task.targetLocation.folderId,
        objectKey: task.targetLocation.objectKey,
      })}.\nError: ${e instanceof Error ? e.name : String(e)}`,
    )
  }

  const originalContentHash = await hashLocalFile(inFilePath)
  const mediaType = mediaTypeFromMimeType(mimeType)
  const metadataFilePath = path.join(metadataOutFileDirectory, 'metadata.json')
  const exiv2Metadata = [MediaType.Image, MediaType.Video].includes(mediaType)
    ? await readFileMetadata(inFilePath, metadataFilePath)
    : {}
  const [metadataDescription, previews] = await analyzeContent({
    inFilePath,
    outFileDirectory: metadataOutFileDirectory,
    mediaType,
    mimeType,
    metadata: exiv2Metadata,
  })

  metadataDescription.mimeType = {
    type: 'inline',
    sizeBytes: Buffer.from(JSON.stringify(mimeType)).length,
    content: JSON.stringify(mimeType),
    mimeType: 'application/json',
  }
  metadataDescription.mediaType = {
    type: 'inline',
    sizeBytes: Buffer.from(JSON.stringify(mediaType)).length,
    content: JSON.stringify(mediaType),
    mimeType: 'application/json',
  }

  const metadataHash = await hashLocalFile(metadataFilePath)
  const metadataSize = (await fs.promises.stat(metadataFilePath)).size
  fs.renameSync(
    metadataFilePath,
    path.join(metadataOutFileDirectory, metadataHash),
  )

  metadataDescription.embeddedMetadata = {
    type: 'external',
    sizeBytes: metadataSize,
    storageKey: metadataHash,
    hash: metadataHash,
    mimeType: 'application/json',
  }

  await server
    .getMetadataSignedUrls(
      Object.values(previews).map((preview) => ({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        folderId: task.targetLocation!.folderId,
        contentHash: originalContentHash,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        objectKey: task.targetLocation!.objectKey!,
        method: SignedURLsRequestMethod.PUT,
        metadataHash: preview.hash,
      })),
    )
    .then((metadataUploadResponse) => {
      if ('error' in metadataUploadResponse) {
        throw new AppAPIError(
          metadataUploadResponse.error.code,
          metadataUploadResponse.error.message,
        )
      }
      const { result } = metadataUploadResponse
      return Promise.all(
        result.map(({ url }, i) => {
          const preview = previews[Object.keys(previews)[i]]
          return uploadFile(
            path.join(metadataOutFileDirectory, preview.hash),
            url,
            preview.mimeType,
          )
        }),
      )
    })

  const stringifiedPreviews = JSON.stringify(previews)
  metadataDescription['previews'] = {
    type: 'inline',
    mimeType: 'application/json',
    sizeBytes: Buffer.from(stringifiedPreviews).length,
    content: stringifiedPreviews,
  }

  if (Object.keys(metadataDescription).length > 0) {
    await server.updateContentMetadata([
      {
        folderId: task.targetLocation.folderId,
        objectKey: task.targetLocation.objectKey,
        hash: originalContentHash,
        metadata: metadataDescription,
      },
    ])
  }

  // remove the temporary directory
  await fs.promises.rmdir(tempDir, { recursive: true })
}
