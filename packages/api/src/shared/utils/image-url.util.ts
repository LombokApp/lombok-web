import { IMAGE_SIZES } from './image-processing.util'

export interface ImageUrls {
  small: string
  medium: string
  large: string
}

export function buildImageUrls(
  routeBase: string,
  imageUpdatedAt: Date | null | undefined,
): ImageUrls | undefined {
  if (!imageUpdatedAt) {
    return undefined
  }
  const version = imageUpdatedAt.getTime()
  const trimmedBase = routeBase.replace(/\/+$/, '')
  const [small, medium, large] = IMAGE_SIZES
  return {
    small: `${trimmedBase}/${small}?v=${version}`,
    medium: `${trimmedBase}/${medium}?v=${version}`,
    large: `${trimmedBase}/${large}?v=${version}`,
  }
}
