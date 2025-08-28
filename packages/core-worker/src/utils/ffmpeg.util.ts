import { MediaType } from '@lombokapp/types'
import { mediaTypeFromMimeType } from '@lombokapp/utils'
import { spawn } from 'bun'
import type { FfmpegCommand } from 'fluent-ffmpeg'
import ffmpegBase from 'fluent-ffmpeg'
import fs from 'fs'
import os from 'os'
import path from 'path'
import sharp from 'sharp'
import { v5 as uuidV5 } from 'uuid'

import { hashLocalFile } from './file.util'
import {
  getExifTagsFromImage,
  previewDimensionsForMaxDimension,
} from './image.util'

export async function getMediaDimensionsWithSharp(
  filePath: string,
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(filePath).metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error('Failed to get image dimensions')
  }

  return {
    width: metadata.width,
    height: metadata.height,
  }
}

export const ffmpeg = ffmpegBase

export const getMediaDimensionsWithFFMpeg = async (filepath: string) => {
  return new Promise<{ width: number; height: number; lengthMs: number }>(
    (resolve, reject) => {
      ffmpeg.ffprobe(filepath, (err, probeResult) => {
        const lengthMs = probeResult.streams[0].duration
          ? parseInt(probeResult.streams[0].duration, 10) * 1000
          : 0
        if (
          !err &&
          probeResult.streams[0].width &&
          probeResult.streams[0].height
        ) {
          resolve({
            width: probeResult.streams[0].width,
            height: probeResult.streams[0].height,
            lengthMs: lengthMs > 0 ? lengthMs : 0,
          })
        } else {
          reject(err instanceof Error ? err : new Error(String(err)))
        }
      })
    },
  )
}

export interface VideoOperationOutput {
  height: number
  width: number
  originalHeight: number
  originalWidth: number
  lengthMs: number
  originalOrientation: number
}

export interface ImageOperationOutput {
  height: number
  width: number
  originalHeight: number
  originalWidth: number
  hash: string
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

async function readStreamToString(
  stream: ReadableStream<Uint8Array> | null,
): Promise<string> {
  if (!stream) {
    return ''
  }

  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let result = ''
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }
    result += decoder.decode(value, { stream: true })
  }
  result += decoder.decode() // flush remaining
  return result
}

export async function convertHeicToJpeg(input: string, output: string) {
  const child = spawn(['heif-dec', input, output], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const _stdoutText = await readStreamToString(child.stdout)
  const stderrText = await readStreamToString(child.stderr)

  const exitCode = await child.exited

  if (exitCode === 1) {
    if (stderrText) {
      console.error('stderr:', stderrText.trim())
    }
    throw new Error('Failed to convert heic to jpeg')
  }
}

export const resizeContent = async ({
  inFilepath,
  outFilepath: outFilePath,
  maxDimension,
  rotation,
  mimeType,
}: {
  inFilepath: string
  outFilepath: string
  maxDimension: number
  rotation?: number
  mimeType: string
}): Promise<ImageOperationOutput> => {
  const mediaType = mediaTypeFromMimeType(mimeType)
  const dimensions =
    mediaType === MediaType.Image
      ? await getMediaDimensionsWithSharp(inFilepath)
      : await getMediaDimensionsWithFFMpeg(inFilepath)

  let finalWidth = dimensions.width
  let finalHeight = dimensions.height

  if (maxDimension < Math.max(dimensions.height, dimensions.width)) {
    const previewDimensions = previewDimensionsForMaxDimension({
      height: finalHeight,
      width: finalWidth,
      maxDimension,
    })
    finalWidth = previewDimensions.width
    finalHeight = previewDimensions.height
  }

  let finalInFilepath = inFilepath

  const tempDir = path.join(
    os.tmpdir(),
    `lombok_resize_image_${uuidV5(inFilepath, uuidV5.URL)}`,
  )
  if (mimeType === 'image/heic') {
    finalInFilepath = path.join(tempDir, 'converted.jpg')
    if (!fs.existsSync(finalInFilepath)) {
      fs.mkdirSync(tempDir)
      await convertHeicToJpeg(inFilepath, finalInFilepath)
    }
  }

  if (mediaType === MediaType.Video) {
    await waitForFFmpegCommand(
      ffmpeg()
        .addInput(finalInFilepath)
        .size(`${finalWidth}x${finalHeight}`)
        .autopad()
        .addOutput(outFilePath)
        .outputOptions(rotation ? [`-metadata:s:v rotate="${rotation}"`] : []),
    )
  } else {
    await sharp(finalInFilepath)
      .rotate(mimeType === 'image/heic' ? 0 : rotation)
      .resize(finalWidth)
      .toFile(outFilePath)
  }

  if (fs.existsSync(tempDir)) {
    fs.rmSync(finalInFilepath)
    fs.rmdirSync(tempDir)
  }

  const returnValue = {
    height: finalHeight,
    width: finalWidth,
    originalHeight: dimensions.height,
    originalWidth: dimensions.width,
    hash: await hashLocalFile(outFilePath),
  }

  return returnValue
}

export const scaleImage = async ({
  inFilePath,
  outFilePath,
  maxDimension,
  rotation,
  mimeType,
}: {
  inFilePath: string
  outFilePath: string
  maxDimension: number
  rotation?: number
  mimeType: string
}): Promise<ImageOperationOutput> => {
  const dimensions = await getMediaDimensionsWithSharp(inFilePath)

  let finalWidth = dimensions.width
  let finalHeight = dimensions.height

  if (maxDimension < Math.max(dimensions.height, dimensions.width)) {
    const previewDimensions = previewDimensionsForMaxDimension({
      height: finalHeight,
      width: finalWidth,
      maxDimension,
    })
    finalWidth = previewDimensions.width
    finalHeight = previewDimensions.height
  }

  let finalInFilePath = inFilePath

  const tempConvertedImageDir = path.join(
    os.tmpdir(),
    `lombok_scaled_image_${uuidV5(inFilePath, uuidV5.URL)}`,
  )
  if (mimeType === 'image/heic') {
    finalInFilePath = path.join(
      tempConvertedImageDir,
      `${inFilePath}__converted.jpg`,
    )
    if (!fs.existsSync(tempConvertedImageDir)) {
      fs.mkdirSync(tempConvertedImageDir)
      await convertHeicToJpeg(inFilePath, finalInFilePath)
    }
  }

  await sharp(finalInFilePath)
    .rotate(mimeType === 'image/heic' ? 0 : rotation)
    .resize(finalWidth)
    .toFile(outFilePath)

  if (fs.existsSync(tempConvertedImageDir)) {
    fs.rmSync(finalInFilePath)
    fs.rmdirSync(tempConvertedImageDir)
  }

  const returnValue = {
    height: finalHeight,
    width: finalWidth,
    originalHeight: dimensions.height,
    originalWidth: dimensions.width,
    hash: await hashLocalFile(outFilePath),
  }

  return returnValue
}

export function parseOrientationToPosition(orientation: string): number {
  if (!orientation) {
    return 0
  }

  // Extract the rotation value from the orientation string
  const rotationMatch = orientation.match(/Rotate (\d+) (CW|CCW)/)
  if (!rotationMatch) {
    return 0
  }

  const degrees = parseInt(rotationMatch[1], 10)
  const direction = rotationMatch[2]

  // Convert to position number (0-359)
  let position = 0
  if (direction === 'CW') {
    position = degrees
  } else if (direction === 'CCW') {
    position = 360 - degrees
  }

  // Ensure the position is within 0-259
  return Math.min(Math.max(position, 0), 359)
}

export async function getNecessaryContentRotation(
  filepath: string,
  mimeType: string,
): Promise<number> {
  if (mimeType.startsWith('image/') && mimeType !== 'image/heic') {
    const metadata = await getExifTagsFromImage(filepath)
    if (
      typeof metadata === 'object' &&
      'Orientation' in metadata &&
      typeof metadata.Orientation === 'string'
    ) {
      // Orientation: "Rotate 270 CW",
      return parseOrientationToPosition(metadata.Orientation)
    }
  }
  return 0
}

export const generateM3u8WithFFmpeg = async (
  inFilepath: string,
  outFilepath: string,
): Promise<void> => {
  const command = ffmpeg().addInput(inFilepath).addOutput(outFilepath)

  // execute the command
  command
    .addOptions([
      '-profile:v baseline',
      '-level 3.0',
      '-start_number 0',
      '-hls_time 10',
      '-hls_list_size 0',
      '-f hls',
    ])
    .run()
  command.on('progress', (progress) => {
    console.log('ffmpeg timemark:', progress.timemark)
  })
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

export const generateMpegDashWithFFmpeg = async (
  inFilepath: string,
  outFilepath: string,
): Promise<void> => {
  // const command = ffmpeg().addInput(inFilepath).addOutput(outFilepath)
  // execute the command
  const command = ffmpeg(inFilepath)
    .videoCodec('libx264')
    // .videoFilter('scale=1280:720')
    .audioCodec('aac')
    .audioBitrate('128k')
    .videoBitrate('2500k')
    // .addOption('-maxrate 2500k')
    // .addOption('-bufsize 5000k')
    .addOption('-x264-params keyint=120:min-keyint=120')
    .outputOptions(
      '-profile:v baseline',
      // '-profile:v:1 baseline',
      // '-profile:v:0 baseline',
      // '-b_strategy 0 -ar:a:1 22050 -use_timeline 1 -use_template 1',
      // '-window_size 5 -adaptation_sets "id=0,streams=v id=1,streams=a"',
      // '-profile:v:0 main',
      // '-level 3.1',
    )
    .addOutput(outFilepath)
  command.run()

  command.on('progress', (progress) => {
    console.log('ffmpeg timemark:', progress.timemark)
  })
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

export interface GenerateAnimatedWebPOptions {
  startAtSeconds?: number
  durationSeconds?: number
  fps?: number
  maxWidth?: number
  quality?: number
  compressionLevel?: number
}

export async function generateAnimatedWebPFromVideo(
  inFilePath: string,
  outFilePath: string,
  options: GenerateAnimatedWebPOptions = {},
): Promise<void> {
  const {
    startAtSeconds = 0,
    durationSeconds = 3,
    fps = 12,
    maxWidth = 480,
    quality = 70,
    compressionLevel = 6,
  } = options

  const command = ffmpeg(inFilePath)
    .seekInput(startAtSeconds)
    .duration(durationSeconds)
    .outputOptions([
      '-vf',
      `fps=${fps},scale=${maxWidth}:-1:flags=lanczos`,
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
    .on('end', () => console.log('Done - animated webp'))
    .on('error', (err) => console.error(err))
  await waitForFFmpegCommand(command)
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
    .on('end', () => console.log('Done - still webp'))
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

export type VideoPreviewVariant = 'single-animated' | 'tv-movie'

export interface GeneratePreviewsResult {
  variant: VideoPreviewVariant
  outputs: {
    unifiedPreviewPath?: string
    thumbnailStillPath?: string
    compressedAnimatedPath?: string
  }
  meta: VideoOperationOutput
}

function classifyVideoVariant({
  lengthMs,
  width,
  height,
  fileSizeBytes,
}: {
  lengthMs: number
  width: number
  height: number
  fileSizeBytes: number
}): VideoPreviewVariant {
  const lengthMinutes = lengthMs / 1000 / 60
  const isLongForm = lengthMinutes >= 30
  const isHighRes = width >= 1920 || height >= 1080
  const isLargeFile = fileSizeBytes >= 700 * 1024 * 1024 // ~700MB
  if (isLongForm && (isHighRes || isLargeFile)) {
    return 'tv-movie'
  }
  return 'single-animated'
}

export async function generatePreviewsForVideo(
  inFilePath: string,
  outDirectory: string,
): Promise<GeneratePreviewsResult> {
  const dimensions = await getMediaDimensionsWithFFMpeg(inFilePath)

  const fileStat = await fs.promises.stat(inFilePath)
  const variant = classifyVideoVariant({
    lengthMs: dimensions.lengthMs,
    width: dimensions.width,
    height: dimensions.height,
    fileSizeBytes: fileStat.size,
  })

  if (variant === 'single-animated') {
    // Single animated WebP used for thumbnails and compressed preview
    const animatedOut = path.join(outDirectory, 'video-preview.webp')
    const lengthSeconds = Math.max(1, Math.floor(dimensions.lengthMs / 1000))

    // Heuristic: if very short, try to cover the full duration without skipping
    const isVeryShort = lengthSeconds <= 8
    const durationSeconds = Math.min(6, lengthSeconds)
    const fps = isVeryShort
      ? Math.min(24, Math.max(8, Math.floor(dimensions.width / 160)))
      : 12
    const startAtSeconds = lengthSeconds > durationSeconds + 1 ? 1 : 0

    await generateAnimatedWebPFromVideo(inFilePath, animatedOut, {
      startAtSeconds,
      durationSeconds,
      fps,
      maxWidth: Math.min(1080, dimensions.width),
      quality: 70,
      compressionLevel: 6,
    })

    return {
      variant,
      outputs: { unifiedPreviewPath: animatedOut },
      meta: {
        width: 0,
        height: 0,
        originalHeight: dimensions.height,
        originalWidth: dimensions.width,
        lengthMs: dimensions.lengthMs,
        originalOrientation: 0,
      },
    }
  }

  // tv-movie variant
  const stillOut = path.join(outDirectory, 'video-thumb.webp')
  const mosaicOut = path.join(outDirectory, 'video-mosaic.webp')

  // Use a cover frame at around 10% into the video, capped to 3 minutes
  const coverSeconds = Math.min(
    Math.max(5, Math.floor((dimensions.lengthMs / 1000) * 0.1)),
    180,
  )
  await generateStillWebPFromVideo(inFilePath, stillOut, {
    atSeconds: coverSeconds,
    maxWidth: Math.min(1024, dimensions.width),
    quality: 80,
  })

  await generateMosaicAnimatedWebPFromVideo(inFilePath, mosaicOut, {
    coverSeconds,
    maxWidth: Math.min(1280, dimensions.width),
    fps: 0.5,
    tileColumns: 3,
    tileRows: 3,
    startAfterSeconds: Math.max(coverSeconds + 60, 120),
    quality: 70,
    compressionLevel: 6,
  })

  return {
    variant,
    outputs: {
      thumbnailStillPath: stillOut,
      compressedAnimatedPath: mosaicOut,
    },
    meta: {
      width: 0,
      height: 0,
      originalHeight: dimensions.height,
      originalWidth: dimensions.width,
      lengthMs: dimensions.lengthMs,
      originalOrientation: 0,
    },
  }
}
