import {
  classifyVideoVariant,
  type Exiv2Metadata,
  generateVideoPreviews,
  getMediaDimensionsWithFFMpeg,
  parseNumericOrientationValueFromMetadata,
  scaleImage,
} from '@lombokapp/core-worker-utils'
import type { ContentMetadataEntry, PreviewMetadata } from '@lombokapp/types'
import { MediaType } from '@lombokapp/types'
import fs from 'fs'
import path from 'path'

async function analyzeImage(
  inFilePath: string,
  outFileDirectory: string,
  mimeType: string,
  metadata: Exiv2Metadata,
): Promise<
  [Record<string, ContentMetadataEntry>, Record<string, PreviewMetadata>]
> {
  const rotation = parseNumericOrientationValueFromMetadata(metadata)
  const scaleConfigs = [
    ['Small Thumbnail', 'thumbnailSm', 'list', 150],
    ['Large Thumbnail', 'thumbnailLg', 'list', 500],
    ['Small Preview', 'previewSm', 'card', 1024],
    ['Large Preview', 'previewLg', 'detail', 2048],
  ] as const

  const outputs = await Promise.all(
    scaleConfigs.map((scaleConfig) => {
      const outFilePath = path.join(outFileDirectory, `${scaleConfig[1]}.webp`)
      return scaleImage({
        inFilePath,
        outFilePath,
        mimeType,
        rotation,
        size: { strategy: 'max', maxDimension: scaleConfig[3] },
      }).then((scaleResult) => ({
        result: scaleResult,
        label: scaleConfig[0],
        profile: scaleConfig[1],
        purpose: scaleConfig[2],
        outFilePath,
      }))
    }),
  )

  const scaleResult = outputs[0].result
  const previewOutputs = outputs.reduce(
    (acc, { result, label, profile, purpose, outFilePath }) => {
      const sizeBytes = fs.statSync(outFilePath).size
      fs.renameSync(outFilePath, path.join(outFileDirectory, result.hash))
      return {
        ...acc,
        [profile]: {
          mimeType: 'image/webp',
          hash: result.hash,
          profile,
          purpose,
          label,
          sizeBytes,
          dimensions: {
            width: result.width,
            height: result.height,
            durationMs: 0,
          },
        },
      }
    },
    {},
  )

  return [
    {
      height: {
        type: 'inline',
        sizeBytes: Buffer.from(JSON.stringify(scaleResult.originalHeight))
          .length,
        content: `${scaleResult.originalHeight}`,
        mimeType: 'application/json',
      },
      width: {
        type: 'inline',
        sizeBytes: Buffer.from(JSON.stringify(scaleResult.originalWidth))
          .length,
        content: `${scaleResult.originalWidth}`,
        mimeType: 'application/json',
      },
    },
    previewOutputs,
  ]
}

async function analyzeVideo(
  inFilePath: string,
  outFileDirectory: string,
): Promise<
  [Record<string, ContentMetadataEntry>, Record<string, PreviewMetadata>]
> {
  const dimensions = await getMediaDimensionsWithFFMpeg(inFilePath)

  const fileStat = await fs.promises.stat(inFilePath)
  const variant = classifyVideoVariant({
    durationMs: dimensions.durationMs,
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

  return [
    {
      height: {
        type: 'inline',
        sizeBytes: Buffer.from(JSON.stringify(dimensions.height)).length,
        content: `${dimensions.height}`,
        mimeType: 'application/json',
      },
      width: {
        type: 'inline',
        sizeBytes: Buffer.from(JSON.stringify(dimensions.width)).length,
        content: `${dimensions.width}`,
        mimeType: 'application/json',
      },
      lengthMs: {
        type: 'inline',
        sizeBytes: Buffer.from(JSON.stringify(dimensions.durationMs)).length,
        content: `${dimensions.durationMs}`,
        mimeType: 'application/json',
      },
    },
    result,
  ]
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
  metadata: Exiv2Metadata
}): Promise<
  [Record<string, ContentMetadataEntry>, Record<string, PreviewMetadata>]
> {
  const contentMetadata: [
    Record<string, ContentMetadataEntry>,
    Record<string, PreviewMetadata>,
  ] = [{}, {}]

  if (mediaType === MediaType.Image) {
    return analyzeImage(inFilePath, outFileDirectory, mimeType, metadata)
  } else if (mediaType === MediaType.Video) {
    return analyzeVideo(inFilePath, outFileDirectory)
  }

  return contentMetadata
}
