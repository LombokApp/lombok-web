import type { WorkerApi } from '@stellariscloud/api-client'
import type { MetadataEntry } from '@stellariscloud/types'
import { MediaType } from '@stellariscloud/types'
import { mediaTypeFromMimeType } from '@stellariscloud/utils'
import type {
  FolderOperationName,
  FolderOperationNameDataTypes,
  WorkerTask,
} from '@stellariscloud/workers'
import fs from 'fs'
import os from 'os'
import path from 'path'

import type { FFMpegOutput } from '../utils/ffmpeg.util'
import { resizeWithFFmpeg } from '../utils/ffmpeg.util'
import {
  downloadFileToDisk,
  hashLocalFile,
  streamUploadFile,
} from '../utils/file.util'

export const indexFolderObjectWorkerFunc = async (
  workerApi: WorkerApi,
  job: WorkerTask<
    FolderOperationNameDataTypes[FolderOperationName.IndexFolderObject],
    FolderOperationName.IndexFolderObject
  >,
) => {
  console.log('Got %s job:', job)
  if (!job.id) {
    throw new Error('No job id!')
  }
  console.log('performing job[%s]:', job.id, job.data)
  const registerStartResult = await workerApi.startJob({
    operationId: job.id,
  })

  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `stellaris_job_${job.id}_`),
  )
  const inFilepath = path.join(tempDir, job.data.objectKey)

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir)
  }

  const { mimeType } = await downloadFileToDisk(
    registerStartResult.data[0].url,
    inFilepath,
    job.data.objectKey,
  )

  // console.log(
  //   'Got input file (type: %s, size: %d):',
  //   mimeType,
  //   fs.statSync(inFilepath).size,
  //   inFilepath,
  // )

  if (!mimeType) {
    throw new Error(
      `Cannot resolve mimeType for objectKey ${job.data.objectKey}`,
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
    const uploadUrls = (
      await workerApi.createMetadataUploadUrls({
        operationId: job.id,
        createMetadataUploadUrlsPayload: {
          contentHash,
          metadataFiles: [
            {
              folderId: job.data.folderId,
              objectKey: job.data.objectKey,
              metadataHashes,
            },
          ],
        },
      })
    ).data

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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      uploadUrls.metadataUploadUrls[0].urls['compressedVersion']!,
      outMimeType,
    )

    await streamUploadFile(
      lgThumbnailOutFilePath,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      uploadUrls.metadataUploadUrls[0].urls['thumbnailLg']!,
      outMimeType,
    )

    await streamUploadFile(
      smThumbnailOutFilePath,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      uploadUrls.metadataUploadUrls[0].urls['thumbnailSm']!,
      outMimeType,
    )
  }

  await workerApi.updateContentAttributes({
    contentAttibutesPayload: [
      {
        folderId: job.data.folderId,
        objectKey: job.data.objectKey,
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
  })

  await workerApi.updateContentMetadata({
    contentMetadataPayload: [
      {
        folderId: job.data.folderId,
        objectKey: job.data.objectKey,
        hash: contentHash,
        metadata: metadataDescription,
      },
    ],
  })

  // remove the temporary directory
  for (const f of fs.readdirSync(tempDir)) {
    fs.rmSync(path.join(tempDir, f))
  }
  fs.rmdirSync(tempDir)

  await workerApi.completeJob({
    operationId: job.id,
  })
}
