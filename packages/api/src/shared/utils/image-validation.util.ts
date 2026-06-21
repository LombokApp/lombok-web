import { BadRequestException } from '@nestjs/common'
import sharp, { type Metadata } from 'sharp'

export const MAX_IMAGE_UPLOAD_BYTES = 1024 * 1024
export const MIN_IMAGE_DIMENSION_PX = 250
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const

export interface ImageUploadInput {
  mimetype: string
  size: number
  buffer: Buffer
}

export async function validateImageUpload(
  file: ImageUploadInput,
): Promise<void> {
  if (file.size === 0) {
    throw new BadRequestException({
      code: 'image_upload_empty',
      message: 'No file was uploaded',
    })
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new BadRequestException({
      code: 'image_upload_too_large',
      message: `File exceeds the ${MAX_IMAGE_UPLOAD_BYTES} byte limit`,
    })
  }

  if (
    !ALLOWED_IMAGE_MIME_TYPES.includes(
      file.mimetype as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
    )
  ) {
    throw new BadRequestException({
      code: 'image_upload_unsupported_format',
      message: `Only ${ALLOWED_IMAGE_MIME_TYPES.join(', ')} are supported`,
    })
  }

  let metadata: Metadata
  try {
    metadata = await sharp(file.buffer, { failOn: 'warning' }).metadata()
  } catch {
    throw new BadRequestException({
      code: 'image_upload_unreadable',
      message: 'Could not read the uploaded image',
    })
  }

  if (metadata.pages && metadata.pages > 1) {
    throw new BadRequestException({
      code: 'image_upload_animated',
      message: 'Animated images are not supported',
    })
  }

  const width = metadata.width
  const height = metadata.height
  if (width < MIN_IMAGE_DIMENSION_PX || height < MIN_IMAGE_DIMENSION_PX) {
    throw new BadRequestException({
      code: 'image_upload_too_small',
      message: `Image must be at least ${MIN_IMAGE_DIMENSION_PX}px wide and tall`,
    })
  }
}
