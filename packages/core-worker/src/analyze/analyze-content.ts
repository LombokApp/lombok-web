import { type ContentMetadataEntry, MediaType } from '@lombokapp/types'
import fs from 'fs'
import path from 'path'
import type { ImageOperationOutput } from 'src/utils'
import {
  generatePreviewsForVideo,
  getNecessaryContentRotation,
  hashLocalFile,
  scaleImage,
} from 'src/utils'

async function analyzeImage(
  inFilePath: string,
  outFileDirectory: string,
  mimeType: string,
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
  const result = await generatePreviewsForVideo(inFilePath, outFileDirectory)

  if (
    result.variant === 'single-animated' &&
    result.outputs.unifiedPreviewPath
  ) {
    const outFilePath = result.outputs.unifiedPreviewPath
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
      ...(result.meta.lengthMs
        ? {
            height: {
              type: 'inline',
              size: Buffer.from(JSON.stringify(result.meta.originalHeight))
                .length,
              content: `${result.meta.originalHeight}`,
              mimeType: 'application/json',
            },
            width: {
              type: 'inline',
              size: Buffer.from(JSON.stringify(result.meta.originalWidth))
                .length,
              content: `${result.meta.originalWidth}`,
              mimeType: 'application/json',
            },
            lengthMs: {
              type: 'inline',
              size: Buffer.from(JSON.stringify(result.meta.lengthMs)).length,
              content: `${result.meta.lengthMs}`,
              mimeType: 'application/json',
            },
          }
        : {}),
    }
  }

  // tv-movie variant
  const stillPath = result.outputs.thumbnailStillPath
  const mosaicPath = result.outputs.compressedAnimatedPath
  if (!stillPath || !mosaicPath) {
    return {}
  }

  const stillHash = await hashLocalFile(stillPath)
  const stillSize = fs.statSync(stillPath).size
  fs.renameSync(stillPath, path.join(outFileDirectory, stillHash))

  const mosaicHash = await hashLocalFile(mosaicPath)
  const mosaicSize = fs.statSync(mosaicPath).size
  fs.renameSync(mosaicPath, path.join(outFileDirectory, mosaicHash))

  return {
    thumbnailLg: {
      hash: stillHash,
      size: stillSize,
      type: 'external',
      mimeType: 'image/webp',
      storageKey: stillHash,
    },
    thumbnailSm: {
      hash: stillHash,
      size: stillSize,
      type: 'external',
      mimeType: 'image/webp',
      storageKey: stillHash,
    },
    compressedVersion: {
      hash: mosaicHash,
      size: mosaicSize,
      type: 'external',
      mimeType: 'image/webp',
      storageKey: mosaicHash,
    },
    ...(result.meta.lengthMs
      ? {
          height: {
            type: 'inline',
            size: Buffer.from(JSON.stringify(result.meta.originalHeight))
              .length,
            content: `${result.meta.originalHeight}`,
            mimeType: 'application/json',
          },
          width: {
            type: 'inline',
            size: Buffer.from(JSON.stringify(result.meta.originalWidth)).length,
            content: `${result.meta.originalWidth}`,
            mimeType: 'application/json',
          },
          lengthMs: {
            type: 'inline',
            size: Buffer.from(JSON.stringify(result.meta.lengthMs)).length,
            content: `${result.meta.lengthMs}`,
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
    return analyzeImage(inFilePath, outFileDirectory, mimeType)
  } else if (mediaType === MediaType.Video) {
    return analyzeVideo(inFilePath, outFileDirectory)
  }

  return contentMetadata
}
