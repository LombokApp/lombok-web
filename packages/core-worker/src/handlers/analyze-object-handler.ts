import { AppAPIError } from '@lombokapp/app-worker-sdk'
import type { coreWorkerMessagePayloadSchemas } from '@lombokapp/core-worker-utils'
import {
  downloadFileToDisk,
  hashLocalFile,
  readFileMetadata,
  uploadFile,
} from '@lombokapp/core-worker-utils'
import { MediaType, SignedURLsRequestMethod } from '@lombokapp/types'
import type { Variant } from '@lombokapp/utils'
import { mediaTypeFromMimeType } from '@lombokapp/utils'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { v4 as uuidV4 } from 'uuid'

import { analyzeContent } from '../analyze/analyze-content'

export const analyzeObject = async (
  folderId: string,
  objectKey: string,
  getContentSignedUrls: (requests: {
    requests: {
      folderId: string
      objectKey: string
      method: SignedURLsRequestMethod
    }[]
  }) => Promise<
    {
      url: string
    }[]
  >,
  getMetadataSignedUrls: (
    requests: {
      folderId: string
      objectKey: string
      contentHash: string
      method: SignedURLsRequestMethod
      metadataHash: string
    }[],
  ) => Promise<
    {
      url: string
    }[]
  >,
): Promise<
  Variant<
    typeof coreWorkerMessagePayloadSchemas.analyze_object.response,
    'success',
    true
  >['result']
> => {
  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), `lombok_task_${crypto.randomUUID()}_`),
  )

  try {
    const metadataOutFileDirectory = path.join(tempDir, 'metadata')
    await fs.promises.mkdir(metadataOutFileDirectory)

    const fileUUID = uuidV4()
    const inFilePath = path.join(tempDir, fileUUID)

    const [contentUrl] = await getContentSignedUrls({
      requests: [{ folderId, objectKey, method: SignedURLsRequestMethod.GET }],
    })

    let mimeType = ''
    try {
      const downloadResult = await downloadFileToDisk(
        contentUrl?.url ?? '',
        inFilePath,
      )
      mimeType = downloadResult.mimeType
      if (!mimeType) {
        throw new AppAPIError(
          'UNRECOGNIZED_MIME_TYPE',
          `Cannot resolve mimeType for objectKey ${objectKey}`,
        )
      }
    } catch (e: unknown) {
      throw new AppAPIError(
        'STORAGE_ACCESS_FAILURE',
        `Failure accessing underlying storage: ${JSON.stringify({
          folderId,
          objectKey,
        })}.\nError: ${e instanceof Error ? e.name : String(e)}`,
      )
    }

    const originalContentHash = await hashLocalFile(inFilePath)
    const mediaType = mediaTypeFromMimeType(mimeType)
    const metadataFilePath = path.join(
      metadataOutFileDirectory,
      'metadata.json',
    )
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

    if (fs.existsSync(metadataFilePath)) {
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
    }

    await getMetadataSignedUrls(
      Object.values(previews).map((preview) => ({
        folderId,
        contentHash: originalContentHash,
        objectKey,
        method: SignedURLsRequestMethod.PUT,
        metadataHash: preview.hash,
      })),
    ).then((urls) => {
      return Promise.all(
        urls.map(({ url }, i) => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const preview = previews[Object.keys(previews)[i]!]!
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

    return {
      contentHash: originalContentHash,
      contentMetadata: metadataDescription,
    }
  } finally {
    // remove the temporary directory
    if (fs.existsSync(tempDir)) {
      await fs.promises.rmdir(tempDir, { recursive: true })
    }
  }
}
