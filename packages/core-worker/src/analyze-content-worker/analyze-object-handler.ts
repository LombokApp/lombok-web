import type { folderObjectSchema } from '@lombokapp/types'
import { MediaType, SignedURLsRequestMethod } from '@lombokapp/types'
import type { Variant } from '@lombokapp/utils'
import { mediaTypeFromMimeType } from '@lombokapp/utils'
import type { coreWorkerMessagePayloadSchemas } from '@lombokapp/worker-utils'
import {
  AsyncWorkError,
  buildUnexpectedError,
  downloadFileToDisk,
  hashLocalFile,
  readFileMetadata,
  uploadFile,
} from '@lombokapp/worker-utils'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { v4 as uuidV4 } from 'uuid'
import type z from 'zod'

import { analyzeContent } from './analyze-content'

export const analyzeObject = async (
  folderId: string,
  objectKey: string,
  getFolderObject: (request: {
    folderId: string
    objectKey: string
  }) => Promise<z.infer<typeof folderObjectSchema>>,
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

    const folderObject = await getFolderObject({ folderId, objectKey })

    try {
      await downloadFileToDisk(contentUrl?.url ?? '', inFilePath)
    } catch (e: unknown) {
      if (e instanceof AsyncWorkError) {
        throw e
      }
      throw buildUnexpectedError({
        code: 'UNEXPECTED_ANALYZE_OBJECT_ERROR',
        message: `Unexpected error while analyzing object ${objectKey}`,
        error: e,
      })
    }

    const originalContentHash = await hashLocalFile(inFilePath)
    const mediaType =
      folderObject.mediaType !== MediaType.Unknown
        ? folderObject.mediaType
        : mediaTypeFromMimeType(folderObject.mimeType)
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
      mimeType: folderObject.mimeType,
      metadata: exiv2Metadata,
    })

    metadataDescription.mimeType = {
      type: 'inline',
      sizeBytes: Buffer.from(JSON.stringify(folderObject.mimeType)).length,
      content: JSON.stringify(folderObject.mimeType),
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
      await fs.promises.rm(tempDir, { recursive: true })
    }
  }
}
