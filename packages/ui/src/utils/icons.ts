import { MediaType } from '@lombokapp/types'
import { mediaTypeFromMimeType } from '@lombokapp/utils'
import { FileIcon, FileTextIcon, Film, Image, Music } from 'lucide-react'

export const iconForMediaType = (mediaType: MediaType) => {
  if (mediaType === MediaType.AUDIO) {
    return Music
  } else if (mediaType === MediaType.IMAGE) {
    return Image
  } else if (mediaType === MediaType.VIDEO) {
    return Film
  } else if (mediaType === MediaType.DOCUMENT) {
    return FileTextIcon
  }
  return FileIcon
}

export const iconForMimeType = (mimeType: string) =>
  iconForMediaType(mediaTypeFromMimeType(mimeType))
