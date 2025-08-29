import { VideoPreviewVariant } from './ffmpeg.util'

export function classifyVideoVariant({
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
  const isVertical = height > width
  const isHighRes = width >= 1920 || height >= 1080
  const isLargeFile = fileSizeBytes >= 700 * 1024 * 1024 // ~700MB
  if (isLongForm && !isVertical && (isHighRes || isLargeFile)) {
    return VideoPreviewVariant.TV_MOVIE
  }
  return VideoPreviewVariant.SHORT_FORM
}
