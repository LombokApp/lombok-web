import type { ContentMetadataEntry } from '@lombokapp/types'
import { MediaType } from '@lombokapp/types'
import fs from 'fs'
import path from 'path'

import type { ImageOperationOutput } from '../utils'
import {
  generateVideoPreviews,
  getMediaDimensionsWithFFMpeg,
  getNecessaryContentRotationFromMetadata,
  scaleImage,
} from '../utils'
import { type ExifToolMetadata } from '../utils/metadata.util'
import { classifyVideoVariant } from '../utils/video.util'

async function analyzeImage(
  inFilePath: string,
  outFileDirectory: string,
  mimeType: string,
  metadata: ExifToolMetadata,
): Promise<Record<string, ContentMetadataEntry>> {
  const rotation = getNecessaryContentRotationFromMetadata(metadata)
  const scaleConfigs = [
    ['preview:thumbnail_sm', 150],
    ['preview:thumbnail_lg', 500],
    ['preview:sm', 1024],
    ['preview:lg', 2048],
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
  const dimensions = await getMediaDimensionsWithFFMpeg(inFilePath)

  const fileStat = await fs.promises.stat(inFilePath)
  const variant = classifyVideoVariant({
    lengthMs: dimensions.lengthMs,
    width: dimensions.width,
    height: dimensions.height,
    fileSizeBytes: fileStat.size,
  })

  const result = await generateVideoPreviews({
    inFilePath,
    outFileDirectory,
    variant,
    dimensions,
  })

  return {
    ...result,
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
}

export async function analyzeContent({
  inFilePath,
  outFileDirectory,
  mediaType,
  mimeType,
  metadata,
}: {
  inFilePath: string
  outFileDirectory: string
  mediaType: MediaType
  mimeType: string
  metadata: ExifToolMetadata
}): Promise<Record<string, ContentMetadataEntry>> {
  const contentMetadata: Record<string, ContentMetadataEntry> = {}

  if (mediaType === MediaType.Image) {
    return analyzeImage(inFilePath, outFileDirectory, mimeType, metadata)
  } else if (mediaType === MediaType.Video) {
    return analyzeVideo(inFilePath, outFileDirectory)
  }

  return contentMetadata
}
