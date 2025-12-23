import { MediaType } from '@lombokapp/types'
import type {
  AudioMediaMimeTypes,
  ImageMediaMimeTypes,
  VideoMediaMimeTypes,
} from '@lombokapp/utils'
import {
  AUDIO_MEDIA_MIME_TYPES,
  IMAGE_MEDIA_MIME_TYPES,
  VIDEO_MEDIA_MIME_TYPES,
} from '@lombokapp/utils'
import { FileIcon, FileTextIcon, Film, Image, Music } from 'lucide-react'

export const iconForMimeType = (mimeType: string) => {
  if (AUDIO_MEDIA_MIME_TYPES.includes(mimeType as AudioMediaMimeTypes)) {
    return Music
  } else if (IMAGE_MEDIA_MIME_TYPES.includes(mimeType as ImageMediaMimeTypes)) {
    return Image
  } else if (VIDEO_MEDIA_MIME_TYPES.includes(mimeType as VideoMediaMimeTypes)) {
    return Film
  }
  return FileIcon
}

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
