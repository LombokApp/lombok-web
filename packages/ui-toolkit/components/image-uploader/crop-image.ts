import type { PixelCrop } from 'react-image-crop'

export interface CompressOptions {
  /** Edge length of the square output, in device px. Backend's largest derivative; always ≥250. */
  outputSize?: number
  /** Hard ceiling for the encoded payload. Kept under the 1 MB backend cap. */
  maxBytes?: number
  initialQuality?: number
  minQuality?: number
  /** Fallback floor when shrinking to hit the budget; never goes below 250. */
  minOutputSize?: number
}

export interface CropToFileParams {
  /** The live ReactCrop <img> (inherits the browser's EXIF auto-orientation). */
  image: HTMLImageElement
  /** react-image-crop completedCrop, in displayed (layout) px. */
  crop: PixelCrop
  /** Zoom factor applied to the <img> via CSS transform. */
  scale: number
  /** Rotation applied to the <img> via CSS transform, in degrees. */
  rotate?: number
  fileName: string
  options?: CompressOptions
}

export type OutputImageType = 'image/webp' | 'image/jpeg'

/** Output never drops below 250px on a side — matches the backend's minimum dimension. */
const MIN_OUTPUT_FLOOR = 250

export const DEFAULT_COMPRESS_OPTIONS: Required<CompressOptions> = {
  outputSize: 512,
  maxBytes: 900 * 1024,
  initialQuality: 0.9,
  minQuality: 0.5,
  minOutputSize: 256,
}

export interface CropTransform {
  scaleX: number
  scaleY: number
  /** Crop origin in source (natural) px. */
  cropX: number
  cropY: number
  /** Square edge of the crop in source px (locks the destination to exactly 1:1). */
  cropSizeNatural: number
}

/**
 * Maps a displayed-px crop to source-px geometry. Pure (no DOM); the zoom and
 * rotate transforms are reproduced in the canvas draw, not here.
 */
export function computeCropTransform(params: {
  crop: Pick<PixelCrop, 'x' | 'y' | 'width' | 'height'>
  naturalWidth: number
  naturalHeight: number
  displayWidth: number
  displayHeight: number
}): CropTransform {
  const scaleX = params.naturalWidth / params.displayWidth
  const scaleY = params.naturalHeight / params.displayHeight
  const cropWidthNatural = params.crop.width * scaleX
  const cropHeightNatural = params.crop.height * scaleY
  return {
    scaleX,
    scaleY,
    cropX: params.crop.x * scaleX,
    cropY: params.crop.y * scaleY,
    cropSizeNatural: Math.min(cropWidthNatural, cropHeightNatural),
  }
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

function qualitySteps(initial: number, min: number): number[] {
  const steps: number[] = []
  for (let q = initial; q >= min - 1e-9; q -= 0.1) {
    steps.push(Math.round(q * 100) / 100)
  }
  return steps
}

/**
 * Encodes the canvas under a byte budget. Walks the quality ladder, and if the
 * smallest quality is still over budget, shrinks the output size and retries.
 * `encode` is injected so the ladder is unit-testable without a real canvas.
 */
export async function encodeWithinBudget(params: {
  encode: (
    outputSize: number,
    type: OutputImageType,
    quality: number,
  ) => Promise<Blob | null>
  outputSize: number
  options: Required<CompressOptions>
}): Promise<Blob> {
  const { encode, outputSize, options } = params
  const floor = Math.max(MIN_OUTPUT_FLOOR, Math.floor(options.minOutputSize))
  const qualities = qualitySteps(options.initialQuality, options.minQuality)

  let type: OutputImageType = 'image/webp'
  let typeResolved = false
  let size = outputSize

  for (;;) {
    for (const quality of qualities) {
      let blob = await encode(size, type, quality)
      if (!blob) {
        throw new Error('Image encoding failed')
      }
      if (!typeResolved) {
        typeResolved = true
        // A browser that can't encode WebP silently produces another type
        // (older Safari). Fall back to JPEG — sharp re-encodes to WebP anyway.
        if (blob.type !== 'image/webp') {
          type = 'image/jpeg'
          blob = await encode(size, type, quality)
          if (!blob) {
            throw new Error('Image encoding failed')
          }
        }
      }
      if (blob.size <= options.maxBytes) {
        return blob
      }
    }
    const next = Math.floor(size * 0.85)
    if (next < floor) {
      break
    }
    size = next
  }
  throw new Error('Unable to compress the image under the size budget')
}

/**
 * Renders the chosen crop to a square canvas and encodes it to a WebP File
 * under the byte budget. The canvas reproduces the same scale + rotate the user
 * sees on the <img>, so the result is exactly what was selected.
 */
export async function cropImageToWebpFile(
  params: CropToFileParams,
): Promise<File> {
  const { image, crop, scale: zoom, rotate = 0, fileName, options } = params
  const opts: Required<CompressOptions> = {
    ...DEFAULT_COMPRESS_OPTIONS,
    ...options,
  }

  const transform = computeCropTransform({
    crop,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    displayWidth: image.width,
    displayHeight: image.height,
  })
  if (!(transform.cropSizeNatural > 0)) {
    throw new Error('Invalid crop selection')
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable')
  }

  const centerX = image.naturalWidth / 2
  const centerY = image.naturalHeight / 2

  const draw = (canvasSize: number) => {
    canvas.width = canvasSize
    canvas.height = canvasSize
    // Do not pre-fill: a transparent canvas preserves PNG alpha into the WebP.
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    // Crop + downscale in one pass, mirroring the <img>'s center-origin
    // transform: scale(zoom) rotate(rotate).
    const k = canvasSize / transform.cropSizeNatural
    ctx.scale(k, k)
    ctx.translate(-transform.cropX, -transform.cropY)
    ctx.translate(centerX, centerY)
    if (rotate) {
      ctx.rotate((rotate * Math.PI) / 180)
    }
    if (zoom !== 1) {
      ctx.scale(zoom, zoom)
    }
    ctx.translate(-centerX, -centerY)
    ctx.drawImage(image, 0, 0)
  }

  let drawnSize = -1
  const blob = await encodeWithinBudget({
    outputSize: opts.outputSize,
    options: opts,
    encode: (canvasSize, type, quality) => {
      if (canvasSize !== drawnSize) {
        draw(canvasSize)
        drawnSize = canvasSize
      }
      return canvasToBlob(canvas, type, quality)
    },
  })

  const extension = blob.type === 'image/webp' ? 'webp' : 'jpg'
  const baseName = fileName.replace(/\.[^./\\]+$/, '') || 'image'
  return new File([blob], `${baseName}.${extension}`, { type: blob.type })
}
