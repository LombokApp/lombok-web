import { spawn } from 'bun'
import fs from 'fs'
import os from 'os'
import path from 'path'
import sharp from 'sharp'
import { v4 as uuidV4 } from 'uuid'

import { calculateOutputDimensions } from './dimension.util'
import { hashLocalFile } from './file.util'
import { readStreamToString } from './stream.util'

export interface ImageOperationOutput {
  height: number
  width: number
  originalHeight: number
  originalWidth: number
  hash: string
}

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

export const scaleImage = async ({
  inFilePath,
  outFilePath,
  size,
  rotation = 0,
  mimeType,
}: {
  inFilePath: string
  outFilePath: string
  size:
    | { strategy: 'max'; maxDimension: number }
    | {
        strategy: 'exact'
        width: number
        height: number
        mode?: 'cover' | 'contain'
      }
  rotation?: number
  mimeType: string
}): Promise<ImageOperationOutput> => {
  const dimensions = await getMediaDimensionsWithSharp(inFilePath)

  let finalWidth = dimensions.width
  let finalHeight = dimensions.height

  const usingExplicitSize = size.strategy === 'exact'

  if (usingExplicitSize) {
    if (size.width <= 0 || size.height <= 0) {
      throw new Error('targetWidth and targetHeight must be positive numbers')
    }
    finalWidth = size.width
    finalHeight = size.height
  } else {
    const maxDimension = size.maxDimension
    if (maxDimension <= 0) {
      throw new Error('maxDimension must be a positive number')
    }
    if (maxDimension < Math.max(dimensions.height, dimensions.width)) {
      const previewDimensions = calculateOutputDimensions({
        inputHeight: dimensions.height,
        inputWidth: dimensions.width,
        maxDimension,
        rotation: mimeType === 'image/heic' ? 0 : rotation,
      })
      finalWidth = previewDimensions.width
      finalHeight = previewDimensions.height
    }
  }

  let finalInFilePath = inFilePath

  const tempConvertedImageDir = path.join(
    os.tmpdir(),
    `lombok_scaled_image_${uuidV4()}`,
  )
  if (mimeType === 'image/heic') {
    finalInFilePath = path.join(tempConvertedImageDir, `__converted.jpg`)
    if (!fs.existsSync(tempConvertedImageDir)) {
      fs.mkdirSync(tempConvertedImageDir)
      await convertHeicToJpeg(inFilePath, finalInFilePath)
    }
  }

  const sharpInstance = sharp(finalInFilePath, { animated: true }).rotate()

  if (usingExplicitSize) {
    await sharpInstance
      .resize(finalWidth, finalHeight, {
        fit: size.mode === 'contain' ? 'contain' : 'cover',
        position: 'centre',
        background:
          size.mode === 'contain' ? { r: 0, g: 0, b: 0, alpha: 0 } : undefined,
      })
      .toFile(outFilePath)
  } else {
    await sharpInstance.resize(finalWidth).toFile(outFilePath)
  }

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
