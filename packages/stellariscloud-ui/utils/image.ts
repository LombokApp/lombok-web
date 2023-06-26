import { extensionFromMimeType } from '@stellariscloud/utils'
import EXIF from 'exif-js'

import type { FFmpegWrapper } from './ffmpeg'

export interface MediaDimensions {
  width: number
  height: number
  lengthMilliseconds?: number
}

export const fileReaderFromBlob = (blob: Blob): Promise<FileReader> => {
  return new Promise((resolve, _reject) => {
    const f = new FileReader()
    f.onload = () => {
      resolve(f)
    }
    f.readAsDataURL(blob)
  })
}

export interface ResizedImage {
  blob: Blob
  width: number
  height: number
}

export enum CropType {
  NONE = 'none',
  SQUARE = 'square',
  VERTICAL = 'vertical',
  WIDESCREEN = 'widescreen',
}

interface CropConfig {
  cropType: CropType
  cropOffset?: { horizontal: 0; vertical: 0 }
}

interface ResizeConfig {
  maxSize: number
  imageOrientation?: number
  quality: number
  crop: CropConfig | undefined
  outputExtension: string
}

export const calculateCropPositions = ({
  width,
  height,
  crop,
}: {
  crop: CropConfig
  width: number
  height: number
}) => {
  if (crop.cropType === CropType.SQUARE) {
    const dimension = Math.min(width, height)
    return {
      cropHeight: dimension,
      cropWidth: dimension,
      cropXOffset: (width - dimension) / 2,
      cropYOffset: (height - dimension) / 2,
    }
  } else if (crop.cropType === CropType.VERTICAL) {
    if (width > height) {
      const newWidth = height * (9 / 16)
      return {
        cropHeight: height,
        cropWidth: newWidth,
        cropXOffset: crop.cropOffset
          ? crop.cropOffset.horizontal
          : (width - newWidth) / 2,
        cropYOffset: 0,
      }
    } else {
      const newHeight = width / (9 / 16)
      return {
        cropHeight: newHeight,
        cropWidth: width,
        cropXOffset: 0,
        cropYOffset: crop.cropOffset
          ? crop.cropOffset.vertical
          : (height - newHeight) / 2,
      }
    }
  } else if (crop.cropType === CropType.WIDESCREEN) {
    if (height > width) {
      const newHeight = width * (9 / 16)
      return {
        cropWidth: width,
        cropHeight: newHeight,
        cropXOffset: 0,
        cropYOffset: crop.cropOffset
          ? crop.cropOffset.vertical
          : (height - newHeight) / 2,
      }
    } else {
      const newWidth = height / (9 / 16)
      return {
        cropWidth: newWidth,
        cropHeight: height,
        cropXOffset: crop.cropOffset
          ? crop.cropOffset.horizontal
          : (width - newWidth) / 2,
        cropYOffset: 0,
      }
    }
  }
  return {
    cropWidth: width,
    cropHeight: height,
    cropXOffset: 0,
    cropYOffset: 0,
  }
}

export const cropImageWithFFmpeg = async (
  ffmpeg: FFmpegWrapper,
  blob: Blob,
  dimensions: MediaDimensions,
  crop: CropConfig,
): Promise<{ dimensions: MediaDimensions; blob: Blob }> => {
  const { cropWidth, cropHeight, cropXOffset, cropYOffset } =
    calculateCropPositions({
      height: dimensions.height,
      width: dimensions.width,
      crop,
    })
  //   console.log(
  //     'start of cropImageWithFFmpeg...',
  //     {
  //       cropWidth,
  //       cropHeight,
  //       cropXOffset,
  //       cropYOffset,
  //     },
  //     crop,
  //   )
  const extension = extensionFromMimeType(blob.type)
  const inputFilename = `/input.${extension}`
  const outputFilename = `/output.${extension}`
  ffmpeg.writeFile(inputFilename, new Uint8Array(await blob.arrayBuffer()))
  const cropCommand = `crop=${cropWidth}:${cropHeight}:${cropXOffset}:${cropYOffset}`
  //   console.log('cropCommand:', cropCommand)
  await ffmpeg.run(
    '-i',
    inputFilename,
    '-filter:v',
    cropCommand,
    outputFilename,
  )
  // read out file
  const outputBlob = new Blob([ffmpeg.readFile(outputFilename)], {
    type: blob.type,
  })
  //   const croppedBlobDataURL = await new Promise((resolve) => {
  //     const blobReader = new FileReader()
  //     blobReader.onload = (e) => {
  //       resolve(e.target?.result)
  //     }
  //     blobReader.readAsDataURL(outputBlob)
  //   })
  //   console.log('cropped blob:', croppedBlobDataURL)

  // delete in and out files
  ffmpeg.unlink(outputFilename)
  ffmpeg.unlink(inputFilename)

  return {
    blob: outputBlob,
    dimensions: { height: cropHeight, width: cropWidth },
  }
}

export const previewDimensionsForMaxSize = ({
  width,
  height,
  maxSize,
}: {
  width: number
  height: number
  maxSize: number
}): {
  width: number
  height: number
} => {
  //   console.log('previewDimensionsForMaxSize input:', { width, height })
  const maxDimension = Math.min(maxSize, Math.min(width, height))
  //   console.log('previewDimensionsForMaxSize maxDimension:', maxDimension)
  let h = height
  let w = width
  if (w > h) {
    if (w > maxDimension) {
      h *= maxDimension / w
      w = maxDimension
    }
  } else if (height > maxDimension) {
    w *= maxDimension / h
    h = maxDimension
  }

  w = Math.floor(w)
  h = Math.floor(h)
  const result = { width: w + (w % 2), height: h + (h % 2) }
  //   console.log('previewDimensionsForMaxSize result:', result)
  return result
}

export const resizeWithFFmpeg = async (
  ffmpeg: FFmpegWrapper,
  blob: Blob,
  resizeConfig: ResizeConfig,
): Promise<{ blob: Blob; height: number; width: number }> => {
  const { crop, maxSize /*, quality*/, imageOrientation } = resizeConfig
  const inputExtension = extensionFromMimeType(blob.type)
  // const outputExtension = inputExtension
  const outputExtension = resizeConfig.outputExtension
  const inputFilename = `/input.${inputExtension}`
  const outputFilename = `/output.${outputExtension}`
  const dimensions = await ffmpeg.getMediaDimensions(blob)
  const commands: string[] = []

  let maxDimension = maxSize
  let finalWidth = dimensions.width
  let finalHeight = dimensions.height
  if (crop && crop.cropType !== CropType.NONE) {
    const { cropWidth, cropHeight, cropXOffset, cropYOffset } =
      calculateCropPositions({
        height: dimensions.height,
        width: dimensions.width,
        crop,
      })
    finalWidth = cropWidth
    finalHeight = cropHeight
    maxDimension = Math.min(maxDimension, cropWidth)

    const cropCommand = `crop=${cropWidth}:${cropHeight}:${cropXOffset}:${cropYOffset}`
    commands.push(cropCommand)
  }

  if (maxDimension < Math.max(dimensions.height, dimensions.width)) {
    const previewDimensions = previewDimensionsForMaxSize({
      height: finalHeight,
      width: finalWidth,
      maxSize,
    })
    finalWidth = previewDimensions.width
    finalHeight = previewDimensions.height
    const scaleCommand = `scale=${finalWidth}:${finalHeight}`
    commands.push(scaleCommand)
  }

  if (imageOrientation) {
    switch (imageOrientation) {
      case 8:
        // 90 degrees clockwise
        commands.push(`transpose=2`)
        ;[finalHeight, finalWidth] = [finalWidth, finalHeight]
        break
      case 6:
        // 90 degrees counter-clockwise
        commands.push(`transpose=1`)
        ;[finalHeight, finalWidth] = [finalWidth, finalHeight]
        break
      case 3:
        // 180 degrees flipped (upside down)
        commands.push(`transpose=1,transpose=1`)
        break
    }
  }

  const command = `${commands.join(',')}`
  ffmpeg.writeFile(inputFilename, new Uint8Array(await blob.arrayBuffer()))
  await ffmpeg.run(
    '-i',
    inputFilename,
    ...(command.length > 0 ? ['-vf', command] : []),
    outputFilename,
  )

  // read out file
  const outputBlob = new Blob([ffmpeg.readFile(outputFilename)], {
    type: blob.type,
  })

  // delete in and out files
  ffmpeg.unlink(outputFilename)
  ffmpeg.unlink(inputFilename)
  return { blob: outputBlob, height: finalHeight, width: finalWidth }
}

export const generatePreviewsWithFFmpeg = async (
  ffmpeg: FFmpegWrapper,
  blob: Blob,
  resizeConfigs: ResizeConfig[],
): Promise<({ blob: Blob; height: number; width: number } | undefined)[]> => {
  const results: { blob: Blob; height: number; width: number }[] = []
  for (const resizeConfig of resizeConfigs) {
    results.push(
      await resizeWithFFmpeg(ffmpeg, blob, resizeConfig).catch((e) => {
        console.error('Error resizing media:', resizeConfig, e)
        throw e
      }),
    )
  }
  return results
}

export const getExifTagsFromImage = async (
  blob: Blob,
): Promise<{ [key: string]: string }> => {
  return EXIF.readFromBinaryFile(await blob.arrayBuffer())
}
