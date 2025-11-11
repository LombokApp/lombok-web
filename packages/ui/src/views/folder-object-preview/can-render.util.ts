import type { FolderObjectDTO } from '@lombokapp/types'

export function canRenderOriginal(
  folderObject: FolderObjectDTO,
  maxSizeBytes: number,
): {
  result: boolean
  reason?: 'TOO_LARGE' | 'FORMAT_NOT_SUPPORTED'
} {
  const isSmallEnoughForAutomaticOriginalView =
    folderObject.sizeBytes < maxSizeBytes

  if (!isSmallEnoughForAutomaticOriginalView) {
    return { result: false, reason: 'TOO_LARGE' }
  }

  if (folderObject.mediaType === 'IMAGE') {
    if (['image/heic', 'image/heif'].includes(folderObject.mimeType)) {
      return { result: false, reason: 'FORMAT_NOT_SUPPORTED' }
    }
    return { result: true }
  }

  if (folderObject.mediaType === 'VIDEO') {
    return { result: true }
  }

  if (folderObject.mediaType === 'DOCUMENT') {
    if (folderObject.mimeType === 'application/pdf') {
      return { result: true }
    }
  }

  return { result: false, reason: 'FORMAT_NOT_SUPPORTED' }
}
