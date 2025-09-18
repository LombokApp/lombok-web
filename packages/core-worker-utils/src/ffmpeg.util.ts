import { type PreviewMetadata } from '@lombokapp/types'
import type { FfmpegCommand } from 'fluent-ffmpeg'
import ffmpegBase from 'fluent-ffmpeg'
import fs from 'fs'
import path from 'path'

import { calculateOutputDimensions } from './dimension.util'
import { hashLocalFile } from './file.util'
import { scaleImage } from './image.util'

export const ffmpeg = ffmpegBase

export const getMediaDimensionsWithFFMpeg = async (filepath: string) => {
  return new Promise<{ width: number; height: number; durationMs: number }>(
    (resolve, reject) => {
      ffmpeg.ffprobe(filepath, (err, probeResult) => {
        if (err) {
          reject(err instanceof Error ? err : new Error(String(err)))
          return
        }

        const videoStream = probeResult.streams.find(
          (stream) => stream.codec_type === 'video',
        )

        if (!videoStream) {
          reject(new Error('No video stream found'))
          return
        } else if (!videoStream.width || !videoStream.height) {
          reject(new Error('No video width or height found'))
          return
        } else if (!videoStream.duration) {
          reject(new Error('No video duration found'))
          return
        }

        const durationMs = videoStream.duration
          ? parseInt(videoStream.duration, 10) * 1000
          : 0

        resolve({
          width: videoStream.width,
          height: videoStream.height,
          durationMs: durationMs > 0 ? durationMs : 0,
        })
      })
    },
  )
}

export interface VideoOperationOutput {
  height: number
  width: number
  originalHeight: number
  originalWidth: number
  durationMs: number
  originalOrientation: number
}

async function waitForFFmpegCommand(command: FfmpegCommand) {
  command.run()
  // wait for end or error
  await new Promise((resolve, reject) => {
    command.on('end', () => {
      resolve(undefined)
    })
    command.on('error', (e) => {
      reject(e)
    })
  })
}

export const generateM3u8WithFFmpeg = async (
  inFilepath: string,
  outFilepath: string,
): Promise<void> => {
  const command = ffmpeg().addInput(inFilepath).addOutput(outFilepath)

  command
    .outputOptions([
      '-c copy', // no re-encode (must be H.264/AAC)
      '-hls_time 10',
      '-hls_list_size 0',
      '-hls_playlist_type vod',
      '-hls_segment_type fmp4', // use fMP4 container
      '-hls_flags single_file+independent_segments',
      '-hls_segment_filename media.m4s', // one big file; playlist uses #EXT-X-BYTERANGE
      '-f hls',
    ])
    .on('progress', (p) => console.log('ffmpeg timemark:', p.timemark))
    .on('error', (err) => console.error('ffmpeg error:', err))
    .on('end', () => console.log('ffmpeg done'))
    .run()

  await waitForFFmpegCommand(command)
}

export const generateMpegDashWithFFmpeg = async (
  inFilePath: string,
  outFilePath: string,
): Promise<void> => {
  // const command = ffmpeg().addInput(inFilepath).addOutput(outFilepath)
  // execute the command
  const command = ffmpeg(inFilePath)
    .videoCodec('libx264')
    .audioCodec('aac')
    .audioBitrate('128k')
    .videoBitrate('2500k')
    .outputOptions([
      '-preset',
      'medium',
      // ensure broad compatibility
      '-pix_fmt',
      'yuv420p',
      // GOP/keyframe alignment for segment boundaries (~2s @ 30fps)
      '-g',
      '60',
      '-x264-params',
      'scenecut=0:keyint=60:min-keyint=60',
      // rate control for stable bitrate
      '-maxrate',
      '2500k',
      '-bufsize',
      '5000k',
      // audio consistency
      '-ac',
      '2',
      '-ar',
      '48000',
      // profile/level for modern devices
      '-profile:v',
      'main',
      '-level',
      '4.0',
      // DASH muxer options
      '-seg_duration',
      '2',
      '-use_template',
      '1',
      '-use_timeline',
      '1',
      '-init_seg_name',
      'init-$RepresentationID$.m4s',
      '-media_seg_name',
      'chunk-$RepresentationID$-$Number%05d$.m4s',
    ])
    .format('dash')
    .addOutput(outFilePath)

  await waitForFFmpegCommand(command)
}

export interface GenerateAnimatedWebPOptions {
  startAtSeconds?: number
  durationMs?: number
  fps?: number
  maxWidth?: number
  quality?: number
  compressionLevel?: number
}

export async function generateAnimatedWebPFromVideo(
  inFilePath: string,
  outFilePath: string,
  options: GenerateAnimatedWebPOptions = {},
): Promise<{
  dimensions: { width: number; height: number; durationMs: number }
}> {
  const {
    startAtSeconds = 0,
    durationMs = 3000,
    fps = 12,
    maxWidth = 480,
    quality = 70,
    compressionLevel = 6,
  } = options

  // Calculate approximate output dimensions based on input dimensions and maxWidth
  const input = await getMediaDimensionsWithFFMpeg(inFilePath)
  const targetWidth = Math.min(maxWidth, input.width)
  const scaledHeightFloat = (input.height * targetWidth) / input.width
  // Ensure even dimensions for broader codec compatibility
  const toEven = (n: number) =>
    Math.floor(n) % 2 === 0 ? Math.floor(n) : Math.floor(n) - 1
  const newDimensions = {
    width: toEven(targetWidth),
    height: toEven(scaledHeightFloat),
    durationMs,
  }

  const command = ffmpeg(inFilePath)
    .seekInput(startAtSeconds)
    .duration(durationMs / 1000)
    .outputOptions([
      '-vf',
      `fps=${fps},scale=${newDimensions.width}:-1:flags=lanczos`,
      '-c:v',
      'libwebp',
      '-q:v',
      String(quality),
      '-compression_level',
      String(compressionLevel),
      '-preset',
      'picture',
      '-loop',
      '0',
      '-an',
      '-vsync',
      '0',
    ])
    .save(outFilePath)
    .on('end', () => console.log(`Done - animated webp: ${outFilePath}`))
    .on('error', (err) => console.error(err))
  await waitForFFmpegCommand(command)

  if (!fs.existsSync(outFilePath)) {
    throw new Error(`Output file does not exist: ${outFilePath}`)
  }

  return { dimensions: newDimensions }
}

export interface GenerateStillFrameOptions {
  atSeconds?: number
  maxWidth?: number
  quality?: number
}

export async function generateStillWebPFromVideo(
  inFilePath: string,
  outFilePath: string,
  options: GenerateStillFrameOptions = {},
): Promise<void> {
  const { atSeconds = 3, maxWidth = 500, quality = 85 } = options

  const command = ffmpeg(inFilePath)
    .seekInput(atSeconds)
    .frames(1)
    .outputOptions([
      '-vf',
      `scale=${maxWidth}:-1:flags=lanczos`,
      '-c:v',
      'libwebp',
      '-q:v',
      String(quality),
    ])
    .save(outFilePath)
    .on('error', (err) => console.error(err))
  await waitForFFmpegCommand(command)
}

export interface GenerateMosaicAnimatedOptions {
  coverSeconds?: number
  // overall output width of the animation
  maxWidth?: number
  quality?: number
  compressionLevel?: number
  fps?: number // frame sampling rate before tiling
  tileColumns?: number
  tileRows?: number
  startAfterSeconds?: number // how far into the video to begin sampling tiles
}

export async function generateMosaicAnimatedWebPFromVideo(
  inFilePath: string,
  outFilePath: string,
  options: GenerateMosaicAnimatedOptions = {},
): Promise<void> {
  const {
    coverSeconds: _coverSeconds = 120, // default to 2 minutes in
    maxWidth = 1280,
    quality = 70,
    compressionLevel = 6,
    fps = 0.5,
    tileColumns = 3,
    tileRows = 3,
    startAfterSeconds = 180, // start sampling a bit later to avoid opening credits
  } = options

  // For simplicity, this creates a tiled animation only. Concatenating a full-screen
  // cover frame as the first animation frame is significantly more complex and can be
  // added later if desired.
  const perTileWidth = Math.max(1, Math.floor(maxWidth / tileColumns))
  const tileFilter = `fps=${fps},scale=${perTileWidth}:-1:flags=lanczos,tile=${tileColumns}x${tileRows}:margin=2:padding=2`

  const command = ffmpeg(inFilePath)
    .seekInput(startAfterSeconds)
    .outputOptions([
      '-vf',
      tileFilter,
      '-c:v',
      'libwebp',
      '-q:v',
      String(quality),
      '-compression_level',
      String(compressionLevel),
      '-preset',
      'picture',
      '-loop',
      '0',
      '-an',
      '-vsync',
      '0',
    ])
    .save(outFilePath)
    .on('end', () => console.log('Done - mosaic animated webp'))
    .on('error', (err) => console.error(err))
  await waitForFFmpegCommand(command)
}

export enum VideoPreviewVariant {
  SHORT_FORM = 'SHORT_FORM',
  TV_MOVIE = 'TV_MOVIE',
}

export interface GeneratePreviewsResult {
  variant: VideoPreviewVariant
  outputs: {
    unifiedPreviewPath?: string
    thumbnailStillPath?: string
    compressedAnimatedPath?: string
  }
  meta: VideoOperationOutput
}

export async function generateVideoPreviewShortForm({
  inFilePath,
  previewOutFilePath,
  dimensions,
}: {
  inFilePath: string
  previewOutFilePath: string
  dimensions: { width: number; height: number; durationMs: number }
}): Promise<{
  dimensions: { width: number; height: number; durationMs: number }
}> {
  // Heuristic: if very short, try to cover the full duration without skipping
  const isVeryShort = dimensions.durationMs <= 8000
  const durationMs = Math.min(6000, dimensions.durationMs)
  const fps = isVeryShort
    ? Math.min(24, Math.max(8, Math.floor(dimensions.width / 160)))
    : 12
  const startAtSeconds = Math.floor(
    (dimensions.durationMs > durationMs + 1000 ? 1000 : 0) / 1000,
  )

  const result = await generateAnimatedWebPFromVideo(
    inFilePath,
    previewOutFilePath,
    {
      startAtSeconds,
      durationMs,
      fps,
      maxWidth: Math.min(1080, dimensions.width),
      quality: 70,
      compressionLevel: 6,
    },
  )
  return result
}

export async function generateVideoPreviews({
  inFilePath,
  outFileDirectory,
  variant,
  dimensions,
}: {
  inFilePath: string
  outFileDirectory: string
  variant: VideoPreviewVariant
  dimensions: { width: number; height: number; durationMs: number }
}): Promise<Record<string, PreviewMetadata>> {
  // Validate input dimensions
  if (dimensions.width <= 0 || dimensions.height <= 0) {
    throw new Error('Video dimensions must be positive numbers')
  }

  const allPreviews: PreviewMetadata[] = []

  async function addVariant(
    label: string,
    profile: string,
    purpose: PreviewMetadata['purpose'],
    outFilePath: string,
    {
      width,
      height,
      durationMs = 0,
    }: { width: number; height: number; durationMs?: number },
  ) {
    const hash = await hashLocalFile(outFilePath)

    allPreviews.push({
      profile,
      purpose,
      hash,
      label,
      sizeBytes: fs.statSync(outFilePath).size,
      mimeType: 'image/webp',
      dimensions: { width, height, durationMs },
    })
    fs.renameSync(outFilePath, path.join(outFileDirectory, hash))
  }

  const previewThumbnailOutFilePath = path.join(
    outFileDirectory,
    'preview-thumb.webp',
  )
  const previewOutFilePath = path.join(outFileDirectory, 'preview.webp')
  if (variant === VideoPreviewVariant.SHORT_FORM) {
    const shortFormPreviewDimensions = await generateVideoPreviewShortForm({
      inFilePath,
      previewOutFilePath,
      dimensions,
    })

    const shortFormThumbnailDimensions = await scaleImage({
      inFilePath: previewOutFilePath,
      outFilePath: previewThumbnailOutFilePath,
      size: { strategy: 'max', maxDimension: 500 },
      mimeType: 'image/webp',
    })

    await addVariant('Preview', 'preview', 'detail', previewOutFilePath, {
      width: shortFormPreviewDimensions.dimensions.width,
      height: shortFormPreviewDimensions.dimensions.height,
      durationMs: 0,
    })

    await addVariant(
      'Thumbnail',
      'thumbnail',
      'list',
      previewThumbnailOutFilePath,
      shortFormThumbnailDimensions,
    )
  } else {
    // Use a cover frame at around 10% into the video, capped to 3 minutes
    const coverSeconds = Math.min(
      Math.max(5, Math.floor((dimensions.durationMs / 1000) * 0.1)),
      180,
    )

    const thumbnailMaxWidth = Math.min(1024, dimensions.width)

    await generateStillWebPFromVideo(inFilePath, previewThumbnailOutFilePath, {
      atSeconds: coverSeconds,
      maxWidth: thumbnailMaxWidth,
      quality: 80,
    })

    const thumbnailOutputDimensions = calculateOutputDimensions({
      inputWidth: dimensions.width,
      inputHeight: dimensions.height,
      maxDimension: thumbnailMaxWidth,
    })

    const previewMaxWidth = Math.min(1280, dimensions.width)
    // For shorter videos, start sampling earlier to ensure we have content
    const videoDurationSeconds = dimensions.durationMs / 1000

    // Ensure we don't start sampling beyond the video duration
    let startAfterSeconds: number
    if (videoDurationSeconds > 300) {
      startAfterSeconds = Math.max(coverSeconds + 60, 120)
    } else if (videoDurationSeconds > 60) {
      startAfterSeconds = Math.max(coverSeconds + 10, 5)
    } else {
      // For very short videos, start sampling from the beginning
      startAfterSeconds = Math.max(coverSeconds, 1)
    }

    // Ensure we don't exceed video duration
    startAfterSeconds = Math.min(startAfterSeconds, videoDurationSeconds - 1)

    // Adjust fps for shorter videos to ensure we get enough frames
    const fps = videoDurationSeconds > 60 ? 0.5 : 1.0

    await generateMosaicAnimatedWebPFromVideo(inFilePath, previewOutFilePath, {
      coverSeconds,
      maxWidth: previewMaxWidth,
      fps,
      tileColumns: 3,
      tileRows: 3,
      startAfterSeconds,
      quality: 70,
      compressionLevel: 6,
    })

    const previewOutputDimensions = calculateOutputDimensions({
      inputWidth: dimensions.width,
      inputHeight: dimensions.height,
      maxDimension: previewMaxWidth,
    })

    await addVariant(
      'Preview',
      'preview',
      'detail',
      previewOutFilePath,
      previewOutputDimensions,
    )

    await addVariant(
      'Thumbnail',
      'thumbnail',
      'list',
      previewThumbnailOutFilePath,
      thumbnailOutputDimensions,
    )
  }

  return allPreviews.reduce<Record<string, PreviewMetadata>>((acc, preview) => {
    acc[`${preview.profile}_${preview.hash}`] = preview
    return acc
  }, {})
}
