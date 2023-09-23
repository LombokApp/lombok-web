import 'reflect-metadata'

import { WorkerApi } from '@stellariscloud/api-client'
import { bindApiConfig } from '@stellariscloud/api-utils'
import type { MetadataEntry } from '@stellariscloud/types'
import { MediaType } from '@stellariscloud/types'
import { formatBytes, mediaTypeFromMimeType } from '@stellariscloud/utils'
import { FolderOperationName } from '@stellariscloud/workers'
import * as tf from '@tensorflow/tfjs-node'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import fs from 'fs'
import mime from 'mime'
import os from 'os'
import path from 'path'
import { container } from 'tsyringe'

import { EnvConfigProvider } from './config/env-config.provider'
import { workerServiceFactory } from './services/worker.service'
import {
  convertToWhisperCPPInputWav,
  transcribeAudio,
} from './utils/audio.util'
import type { FFMpegOutput } from './utils/ffmpeg.util'
import { resizeWithFFmpeg } from './utils/ffmpeg.util'
import {
  downloadFileToDisk,
  hashLocalFile,
  streamUploadFile,
} from './utils/file.util'
import { registerExitHandler } from './utils/process.util'

const config = container.resolve(EnvConfigProvider)
const serviceAuth = config.getServiceAuthConfig()

export const workerApi = bindApiConfig(
  {
    basePath: `${serviceAuth.baseUrl}`,
    baseOptions: {
      headers: { Authorization: `Bearer ${serviceAuth.jwtToken}` },
    },
  },
  WorkerApi,
)()

const metadataWorker = workerServiceFactory(
  FolderOperationName.IndexFolderObject,
  async (job) => {
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
  },
)

const audioTranscribeWorker = workerServiceFactory(
  FolderOperationName.TranscribeAudio,
  async (job) => {
    if (!job.id) {
      throw new Error('No job id!')
    }
    console.log('performing audio transcription job [%s]:', job.id, job.data)
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

    console.log(
      'Got input file (type: %s, size: %d):',
      mimeType,
      fs.statSync(inFilepath).size,
      inFilepath,
    )

    if (!mimeType) {
      throw new Error(
        `Cannot resolve mimeType for objectKey ${job.data.objectKey}`,
      )
    }

    const mediaType = mediaTypeFromMimeType(mimeType)
    console.log('mediaType:', mediaType)
    if (![MediaType.Video, MediaType.Audio].includes(mediaType)) {
      throw new Error('Unsupported MediaType')
    }

    const outputFilepath = path.join(tempDir, `transcription.json`)
    const wavOutputFilepath = await convertToWhisperCPPInputWav(inFilepath)
    const _transcript = await transcribeAudio(wavOutputFilepath, outputFilepath)
    const srtOutputPath = `${wavOutputFilepath}.srt`

    const contentHash = await hashLocalFile(inFilepath)
    const jsonOutputHash = await hashLocalFile(outputFilepath)
    const srtOutputHash = await hashLocalFile(srtOutputPath)

    const uploadUrls = (
      await workerApi.createMetadataUploadUrls({
        operationId: job.id,
        createMetadataUploadUrlsPayload: {
          contentHash,
          metadataFiles: [
            {
              folderId: job.data.folderId,
              objectKey: job.data.objectKey,
              metadataHashes: {
                transcriptJson: jsonOutputHash,
                transcriptSrt: srtOutputHash,
              },
            },
          ],
        },
      })
    ).data

    if (
      !uploadUrls.metadataUploadUrls[0].urls['transcriptJson'] ||
      !uploadUrls.metadataUploadUrls[0].urls['transcriptSrt']
    ) {
      throw new Error("Didn't get the upload urls we were expecting.")
    }
    await streamUploadFile(
      outputFilepath,

      uploadUrls.metadataUploadUrls[0].urls['transcriptJson'],
      'application/json',
    )

    await streamUploadFile(
      srtOutputPath,

      uploadUrls.metadataUploadUrls[0].urls['transcriptSrt'],
      mime.getType('srt') ?? 'text/plain',
    )

    await workerApi.updateContentAttributes({
      contentAttibutesPayload: [
        {
          folderId: job.data.folderId,
          objectKey: job.data.objectKey,
          hash: contentHash,
          attributes: {
            mimeType,
            mediaType,
            bitrate: 0,
            height: 0,
            width: 0,
            lengthMs: 0,
            orientation: 0,
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
          metadata: {
            transcriptJson: {
              hash: jsonOutputHash,
              mimeType: 'application/json',
              size: fs.statSync(outputFilepath).size,
            },
            transcriptSrt: {
              hash: srtOutputHash,
              mimeType: mime.getType('srt') ?? 'text/plain',
              size: fs.statSync(srtOutputPath).size,
            },
          },
        },
      ],
    })

    // console.log('transcript:', JSON.stringify(transcript, null, 2))

    // remove the temporary directory
    let outputSize = 0
    for (const f of fs.readdirSync(tempDir)) {
      const filepath = path.join(tempDir, f)
      if (![wavOutputFilepath, inFilepath].includes(filepath)) {
        outputSize += fs.statSync(filepath).size
        console.log('Output file:', filepath)
      }
      fs.rmSync(filepath)
    }
    console.log('Total output size:', formatBytes(outputSize))
    fs.rmdirSync(tempDir)

    await workerApi.completeJob({
      operationId: job.id,
    })
  },
)

const objectDetectorWorker = workerServiceFactory(
  FolderOperationName.DetectObjects,
  async (job) => {
    if (!job.id) {
      throw new Error('No job id!')
    }
    console.log('performing object detection job [%s]:', job.id, job.data)
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

    console.log(
      'Got input file (type: %s, size: %d):',
      mimeType,
      fs.statSync(inFilepath).size,
      inFilepath,
    )

    if (!mimeType) {
      throw new Error(
        `Cannot resolve mimeType for objectKey ${job.data.objectKey}`,
      )
    }

    const mediaType = mediaTypeFromMimeType(mimeType)
    if (![MediaType.Image].includes(mediaType)) {
      throw new Error('Unsupported MediaType')
    }

    const outputFilepath = path.join(tempDir, `detections.json`)
    const imageBuffer = fs.readFileSync(inFilepath)
    const tfImage = tf.node.decodeImage(imageBuffer)
    const model = await cocoSsd.load({ base: 'mobilenet_v2' })
    const detections = await model.detect(tfImage)

    console.log('Detections:', JSON.stringify(detections, null, 2))
    fs.writeFileSync(outputFilepath, JSON.stringify(detections, null, 2))

    const contentHash = await hashLocalFile(inFilepath)
    const outputFileHash = await hashLocalFile(outputFilepath)

    const uploadUrls = (
      await workerApi.createMetadataUploadUrls({
        operationId: job.id,
        createMetadataUploadUrlsPayload: {
          contentHash,
          metadataFiles: [
            {
              folderId: job.data.folderId,
              objectKey: job.data.objectKey,
              metadataHashes: {
                objectDetections: outputFileHash,
              },
            },
          ],
        },
      })
    ).data

    if (!uploadUrls.metadataUploadUrls[0].urls['objectDetections']) {
      throw new Error("Didn't get the upload url we were expecting.")
    }

    await streamUploadFile(
      outputFilepath,
      uploadUrls.metadataUploadUrls[0].urls['objectDetections'],
      'application/json',
    )

    await workerApi.updateContentAttributes({
      contentAttibutesPayload: [
        {
          folderId: job.data.folderId,
          objectKey: job.data.objectKey,
          hash: contentHash,
          attributes: {
            mimeType,
            mediaType,
            bitrate: 0,
            height: 0,
            width: 0,
            lengthMs: 0,
            orientation: 0,
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
          metadata: {
            objectDetections: {
              hash: outputFileHash,
              mimeType: 'application/json',
              size: fs.statSync(outputFilepath).size,
            },
          },
        },
      ],
    })

    // remove the temporary directory
    let outputSize = 0
    for (const f of fs.readdirSync(tempDir)) {
      const filepath = path.join(tempDir, f)
      if (inFilepath !== filepath) {
        outputSize += fs.statSync(filepath).size
        console.log('Output file:', filepath)
      }
      fs.rmSync(filepath)
    }
    console.log('Total output size:', formatBytes(outputSize))
    fs.rmdirSync(tempDir)

    await workerApi.completeJob({
      operationId: job.id,
    })
  },
)

// const hlsWorker = workerServiceFactory(QueueName.GenerateHLS, async (job) => {
//   if (!job.id) {
//     throw new Error('No job id!')
//   }
//   console.log('performing hls job[%s]:', job.id, job.data)
//   const registerStartResult = await workerApi.startJob({
//     operationId: job.id,
//   })

//   const tempDir = fs.mkdtempSync(
//     path.join(os.tmpdir(), `stellaris_job_${job.id}_`),
//   )
//   const inFilepath = path.join(tempDir, job.data.objectKey)

//   if (!fs.existsSync(tempDir)) {
//     fs.mkdirSync(tempDir)
//   }

//   const { mimeType } = await downloadFileToDisk(
//     registerStartResult.data[0].url,
//     inFilepath,
//     job.data.objectKey,
//   )

//   console.log(
//     'Got input file (type: %s, size: %d):',
//     mimeType,
//     fs.statSync(inFilepath).size,
//     inFilepath,
//   )

//   if (!mimeType) {
//     throw new Error(
//       `Cannot resolve mimeType for objectKey ${job.data.objectKey}`,
//     )
//   }

//   const mediaType = mediaTypeFromMimeType(mimeType)

//   if (mediaType !== MediaType.Video) {
//     throw new Error('Unsupported MediaType')
//   }

//   await generateM3u8WithFFmpeg(inFilepath, path.join(tempDir, `manifest.m3u8`))

//   // remove the temporary directory
//   for (const f of fs.readdirSync(tempDir)) {
//     fs.rmSync(path.join(tempDir, f))
//   }
//   fs.rmdirSync(tempDir)

//   await workerApi.completeJob({
//     operationId: job.id,
//   })
// })

// const mpegDashWorker = workerServiceFactory(
//   QueueName.GenerateMpegDash,
//   async (job) => {
//     if (!job.id) {
//       throw new Error('No job id!')
//     }
//     console.log('performing mpeg-dash job[%s]:', job.id, job.data)
//     const registerStartResult = await workerApi.startJob({
//       operationId: job.id,
//     })

//     const tempDir = fs.mkdtempSync(
//       path.join(os.tmpdir(), `stellaris_job_${job.id}_`),
//     )
//     const inFilepath = path.join(tempDir, job.data.objectKey)

//     if (!fs.existsSync(tempDir)) {
//       fs.mkdirSync(tempDir)
//     }

//     const { mimeType } = await downloadFileToDisk(
//       registerStartResult.data[0].url,
//       inFilepath,
//       job.data.objectKey,
//     )

//     console.log(
//       'Got input file (type: %s, size: %d):',
//       mimeType,
//       fs.statSync(inFilepath).size,
//       inFilepath,
//     )

//     if (!mimeType) {
//       throw new Error(
//         `Cannot resolve mimeType for objectKey ${job.data.objectKey}`,
//       )
//     }

//     const mediaType = mediaTypeFromMimeType(mimeType)
//     if (mediaType !== MediaType.Video) {
//       throw new Error('Unsupported MediaType')
//     }

//     await generateMpegDashWithFFmpeg(
//       inFilepath,
//       path.join(tempDir, `manifest.mpd`),
//     )

//     // remove the temporary directory
//     let outputSize = 0
//     for (const f of fs.readdirSync(tempDir)) {
//       const filepath = path.join(tempDir, f)
//       if (filepath !== inFilepath) {
//         outputSize += fs.statSync(filepath).size
//         if (filepath.endsWith('manifest.mpd')) {
//           console.log('MANIFEST CONTENT:\n\n%s', fs.readFileSync(filepath))
//         }
//         console.log('Output file:', filepath)
//       }
//       // fs.rmSync(filepath)
//     }
//     console.log('Total output size:', formatBytes(outputSize))
//     // fs.rmdirSync(tempDir)

//     await workerApi.completeJob({
//       operationId: job.id,
//     })
//   },
// )

registerExitHandler(async () => {
  await metadataWorker.close()
  await audioTranscribeWorker.close()
  await objectDetectorWorker.close()
  // await hlsWorker.close()
  // await mpegDashWorker.close()
})
