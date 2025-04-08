import os from 'os'
import path from 'path'
import fs from 'fs'
import { spawn } from 'bun'
import { v4 as uuidV4 } from 'uuid'
import ffmpegBase from 'fluent-ffmpeg'
import sharp from 'sharp'

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

import {
  getExifTagsFromImage,
  previewDimensionsForMaxDimension,
} from './image.util'
import { MediaType } from '@stellariscloud/types'

export const ffmpeg = ffmpegBase

export const getMediaDimensionsWithFFMpeg = async (filepath: string) => {
  return new Promise<{ width: number; height: number; lengthMs: number }>(
    (resolve, reject) => {
      ffmpeg.ffprobe(filepath, (err, probeResult) => {
        console.log('probeResult:', probeResult)
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
          reject(err)
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
  originalOrientation: number
}

export const resizeVideo = async (
  inFilepath: string,
  outFilepath: string,
  mimeType: string,
  maxDimension: number,
): Promise<VideoOperationOutput> => {
  console.log('resizeVideo')
  // const isVideo = mediaType === MediaType.Video
  const dimensions = await getMediaDimensionsWithFFMpeg(inFilepath)
  console.log('dimensions:', dimensions)

  let command = ffmpeg().addInput(inFilepath).addOutput(outFilepath)

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

  // execute the command
  command.run()

  const returnValue = {
    height: finalHeight,
    width: finalWidth,
    originalHeight: dimensions.height,
    originalWidth: dimensions.width,
    originalOrientation: 0,
    lengthMs: dimensions.lengthMs,
  }

  // wait for end or error
  await new Promise((resolve, reject) => {
    command.on('end', () => {
      resolve(undefined)
    })
    command.on('error', (e) => {
      reject(e)
    })
  })

  return returnValue
}

export const resizeImage = async (
  inFilepath: string,
  outFilepath: string,
  mimeType: string,
  maxDimension: number,
): Promise<ImageOperationOutput> => {
  console.log('resizeImage')
  // const isVideo = mediaType === MediaType.Video
  const dimensions = await getMediaDimensionsWithSharp(inFilepath)
  console.log('dimensions:', dimensions)

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

  const tempDir = path.join(os.tmpdir(), `stellaris_resize_image_${uuidV4()}`)
  if (mimeType === 'image/heic') {
    fs.mkdirSync(tempDir)
    finalInFilepath = path.join(tempDir, 'converted.jpg')
    await convertHeicToJpeg(inFilepath, finalInFilepath)
  }

  await sharp(finalInFilepath).rotate().resize(finalWidth).toFile(outFilepath)

  if (fs.existsSync(tempDir)) {
    fs.rmSync(finalInFilepath)
    fs.rmdirSync(tempDir)
  }
  // load Exif tags (jpeg only)
  const exifTags =
    mimeType === 'image/jpeg'
      ? await getExifTagsFromImage(inFilepath)
      : undefined

  console.log('exifTags:', exifTags)

  const imageOrientation = exifTags?.image['Orientation']

  console.log('imageOrientation:', imageOrientation)

  const returnValue = {
    height: finalHeight,
    width: finalWidth,
    originalHeight: dimensions.height,
    originalWidth: dimensions.width,
    originalOrientation: imageOrientation ?? 0,
  }

  return returnValue
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
  console.log('outFilepath:', outFilepath)
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

export async function convertHeicToJpeg(input: string, output: string) {
  console.log('Calling heif-convert:', { input, output })

  const child = spawn(['heif-convert', input, output], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const stdoutText = await readStreamToString(child.stdout)
  const stderrText = await readStreamToString(child.stderr)

  const exitCode = await child.exited

  if (exitCode === 0) {
    console.log('✅ Conversion complete')
    if (stdoutText) console.log('stdout:', stdoutText.trim())
    if (stderrText) console.warn('stderr:', stderrText.trim())
  } else {
    console.error('❌ Conversion failed with exit code', exitCode)
    if (stderrText) console.error('stderr:', stderrText.trim())
  }
}

async function readStreamToString(
  stream: ReadableStream<Uint8Array> | null,
): Promise<string> {
  if (!stream) return ''

  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let result = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    result += decoder.decode(value, { stream: true })
  }
  result += decoder.decode() // flush remaining
  return result
}
