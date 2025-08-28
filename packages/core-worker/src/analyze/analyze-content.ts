import { type ContentMetadataEntry, MediaType } from '@lombokapp/types'
import type { ImageMediaMimeTypes } from '@lombokapp/utils'
import fs from 'fs'
import path from 'path'
import type { ImageOperationOutput } from 'src/utils'
import {
  generateAnimatedThumbnailFromVideo,
  getMediaDimensionsWithFFMpeg,
  getNecessaryContentRotation,
  hashLocalFile,
  scaleImage,
} from 'src/utils'

async function analyzeImage(
  inFilePath: string,
  outFileDirectory: string,
  mimeType: ImageMediaMimeTypes,
): Promise<Record<string, ContentMetadataEntry>> {
  const rotation = await getNecessaryContentRotation(inFilePath, mimeType)

  const scaleConfigs = [
    ['thumbnailSm', 150],
    ['thumbnailLg', 500],
    ['compressedVersion', 1024],
  ] as const
  let lastScaleResult: ImageOperationOutput | undefined

  const scaleOutputMetadata = (
    await Promise.all(
      scaleConfigs.map((scaleConfig) => {
        const outFilePath = path.join(
          outFileDirectory,
          `${scaleConfig[0]}.webp`,
        )
        return scaleImage({
          inFilePath,
          outFilePath,
          mimeType,
          rotation,
          maxDimension: scaleConfig[1],
        }).then((scaleResult) => ({
          result: scaleResult,
          key: scaleConfig[0],
          outFilePath,
        }))
      }),
    )
  ).reduce((acc, { result, key, outFilePath }) => {
    lastScaleResult = result
    const size = fs.statSync(outFilePath).size
    fs.renameSync(outFilePath, path.join(outFileDirectory, result.hash))
    return {
      ...acc,
      [key]: {
        type: 'external',
        mimeType: 'image/webp',
        size,
        hash: result.hash,
        storageKey: result.hash,
      },
    }
  }, {})

  return {
    ...(lastScaleResult
      ? {
          height: {
            type: 'inline',
            size: Buffer.from(JSON.stringify(lastScaleResult.originalHeight))
              .length,
            content: `${lastScaleResult.originalHeight}`,
            mimeType: 'application/json',
          },
          width: {
            type: 'inline',
            size: Buffer.from(JSON.stringify(lastScaleResult.originalWidth))
              .length,
            content: `${lastScaleResult.originalWidth}`,
            mimeType: 'application/json',
          },
        }
      : {}),
    ...scaleOutputMetadata,
  }
}

async function analyzeVideo(
  inFilePath: string,
  outFileDirectory: string,
): Promise<Record<string, ContentMetadataEntry>> {
  const outFilePath = path.join(outFileDirectory, 'thumb.webp')
  await generateAnimatedThumbnailFromVideo(inFilePath, outFilePath)
  const dimensions = await getMediaDimensionsWithFFMpeg(inFilePath)
  const hash = await hashLocalFile(outFilePath)
  const size = fs.statSync(outFilePath).size
  fs.renameSync(outFilePath, path.join(outFileDirectory, hash))
  return {
    thumbnailLg: {
      hash,
      size,
      type: 'external',
      mimeType: 'image/webp',
      storageKey: hash,
    },
    thumbnailSm: {
      hash,
      size,
      type: 'external',
      mimeType: 'image/webp',
      storageKey: hash,
    },
    compressedVersion: {
      hash,
      size,
      type: 'external',
      mimeType: 'image/webp',
      storageKey: hash,
    },
    ...(dimensions.lengthMs
      ? {
          height: {
            type: 'inline',
            size: Buffer.from(JSON.stringify(dimensions.height)).length,
            content: `${dimensions.height}`,
            mimeType: 'application/json',
          },
          width: {
            type: 'inline',
            size: Buffer.from(JSON.stringify(dimensions.width)).length,
            content: `${dimensions.width}`,
            mimeType: 'application/json',
          },
          lengthMs: {
            type: 'inline',
            size: Buffer.from(JSON.stringify(dimensions.lengthMs)).length,
            content: `${dimensions.lengthMs}`,
            mimeType: 'application/json',
          },
        }
      : {}),
  }
}

export async function analyzeContent({
  inFilePath,
  outFileDirectory,
  mediaType,
  mimeType,
}: {
  inFilePath: string
  outFileDirectory: string
  mediaType: MediaType
  mimeType: string
}): Promise<Record<string, ContentMetadataEntry>> {
  const contentMetadata: Record<string, ContentMetadataEntry> = {}

  if (mediaType === MediaType.Image) {
    return analyzeImage(
      inFilePath,
      outFileDirectory,
      mimeType as ImageMediaMimeTypes,
    )
  } else if (mediaType === MediaType.Video) {
    return analyzeVideo(inFilePath, outFileDirectory)
  }

  return contentMetadata
}
