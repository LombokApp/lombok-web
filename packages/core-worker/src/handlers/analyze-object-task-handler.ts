import type { AppTask, IAppPlatformService } from '@lombokapp/app-worker-sdk'
import { AppAPIError } from '@lombokapp/app-worker-sdk'
import {
  downloadFileToDisk,
  hashLocalFile,
  readFileMetadata,
  uploadFile,
} from '@lombokapp/core-worker-utils'
import { MediaType, SignedURLsRequestMethod } from '@lombokapp/types'
import { mediaTypeFromMimeType } from '@lombokapp/utils'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { v4 as uuidV4 } from 'uuid'

import { analyzeContent } from '../analyze/analyze-content'

export const analyzeObjectTaskHandler = async (
  task: AppTask,
  server: IAppPlatformService,
) => {
  if (!task.id) {
    throw new AppAPIError('INVALID_TASK', 'Missing task id.')
  }

  if (!task.subjectFolderId) {
    throw new AppAPIError('INVALID_TASK', 'Missing folderId.')
  }

  if (!task.subjectObjectKey) {
    throw new AppAPIError('INVALID_TASK', 'Missing objectKey.')
  }

  const response = await server.getContentSignedUrls([
    {
      folderId: task.subjectFolderId,
      objectKey: task.subjectObjectKey,
      method: SignedURLsRequestMethod.GET,
    },
  ])

  if (response.error) {
    throw new AppAPIError(response.error.code, response.error.message)
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
      response.result.urls[0].url,
      inFilePath,
    )
    mimeType = downloadResult.mimeType
    if (!mimeType) {
      throw new AppAPIError(
        'UNRECOGNIZED_MIME_TYPE',
        `Cannot resolve mimeType for objectKey ${task.subjectObjectKey}`,
      )
    }
  } catch (e: unknown) {
    throw new AppAPIError(
      'STORAGE_ACCESS_FAILURE',
      `Failure accessing underlying storage: ${JSON.stringify({
        folderId: task.subjectFolderId,
        objectKey: task.subjectObjectKey,
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
        folderId: task.subjectFolderId!,
        contentHash: originalContentHash,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        objectKey: task.subjectObjectKey!,
        method: SignedURLsRequestMethod.PUT,
        metadataHash: preview.hash,
      })),
    )
    .then(({ result, error }) => {
      if (error) {
        throw new AppAPIError(error.code, error.message)
      }
      return Promise.all(
        result.urls.map(({ url }, i) => {
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
    const metadataUpdateResponse = await server.updateContentMetadata([
      {
        folderId: task.subjectFolderId,
        objectKey: task.subjectObjectKey,
        hash: originalContentHash,
        metadata: metadataDescription,
      },
    ])

    if (metadataUpdateResponse.error) {
      throw new AppAPIError(
        metadataUpdateResponse.error.code,
        metadataUpdateResponse.error.message,
      )
    }
  }

  // remove the temporary directory
  await fs.promises.rmdir(tempDir, { recursive: true })
}
