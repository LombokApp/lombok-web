import sharp from 'sharp'

export const IMAGE_SIZES = [48, 128, 512] as const
export type ImageSize = (typeof IMAGE_SIZES)[number]

export interface ResizedImageBuffers {
  48: Buffer
  128: Buffer
  512: Buffer
}

export async function cropAndResizeImage(
  input: Buffer,
): Promise<ResizedImageBuffers> {
  const oriented = await sharp(input, { failOn: 'warning' }).rotate().toBuffer()

  const metadata = await sharp(oriented).metadata()
  const width = metadata.width
  const height = metadata.height
  if (!width || !height) {
    throw new Error('Could not read image dimensions')
  }

  const side = Math.min(width, height)
  const left = Math.floor((width - side) / 2)
  const top = Math.floor((height - side) / 2)

  const squared = await sharp(oriented)
    .extract({ left, top, width: side, height: side })
    .toBuffer()

  const resizeOne = (size: ImageSize) =>
    sharp(squared)
      .resize(size, size, { fit: 'cover' })
      .webp({ quality: 85, effort: 4 })
      .toBuffer()

  const [small, medium, large] = await Promise.all([
    resizeOne(48),
    resizeOne(128),
    resizeOne(512),
  ])

  return { 48: small, 128: medium, 512: large }
}
