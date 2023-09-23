import ffmpegBase from 'fluent-ffmpeg'

import {
  getExifTagsFromImage,
  previewDimensionsForMaxDimension,
} from './image.util'

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
          reject(err)
        }
      })
    },
  )
}

export interface FFMpegOutput {
  height: number
  width: number
  originalHeight: number
  originalWidth: number
  lengthMs: number
  originalOrientation: number
}

export const resizeWithFFmpeg = async (
  inFilepath: string,
  outFilepath: string,
  mimeType: string,
  maxDimension: number,
): Promise<FFMpegOutput> => {
  const dimensions = await getMediaDimensionsWithFFMpeg(inFilepath)
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
  // load Exif tags (jpeg only)
  const exifTags =
    mimeType === 'image/jpeg'
      ? await getExifTagsFromImage(inFilepath)
      : undefined
  // console.log('exif:', JSON.stringify(exifTags?.image.Orientation, null, 2))
  // generate previews using ffmpeg, and accouting for the "Orientation" exif tag
  const imageOrientation = exifTags?.image['Orientation']

  switch (imageOrientation) {
    case 8:
    case 6:
      command = command.videoFilter(`scale=${finalHeight}:${finalWidth}`)
      ;[finalHeight, finalWidth] = [finalWidth, finalHeight]
      break
    default:
      command = command.videoFilter(`scale=${finalWidth}:${finalHeight}`)
  }

  // execute the command
  command.run()

  const returnValue = {
    height: finalHeight,
    width: finalWidth,
    originalHeight: dimensions.height,
    originalWidth: dimensions.width,
    originalOrientation: imageOrientation ?? 0,
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
