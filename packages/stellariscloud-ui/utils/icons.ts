import {
  ChatBubbleBottomCenterTextIcon,
  CubeIcon,
  DocumentIcon,
  FilmIcon,
  MagnifyingGlassIcon,
  MusicalNoteIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'
import { FolderOperationName } from '@stellariscloud/api-client'
import { MediaType } from '@stellariscloud/types'
import type {
  AudioMediaMimeTypes,
  ImageMediaMimeTypes,
  VideoMediaMimeTypes,
} from '@stellariscloud/utils'
import {
  AUDIO_MEDIA_MIME_TYPES,
  IMAGE_MEDIA_MIME_TYPES,
  VIDEO_MEDIA_MIME_TYPES,
} from '@stellariscloud/utils'

export const iconForMimeType = (mimeType: string) => {
  if (AUDIO_MEDIA_MIME_TYPES.includes(mimeType as AudioMediaMimeTypes)) {
    return MusicalNoteIcon
  } else if (IMAGE_MEDIA_MIME_TYPES.includes(mimeType as ImageMediaMimeTypes)) {
    return PhotoIcon
  } else if (VIDEO_MEDIA_MIME_TYPES.includes(mimeType as VideoMediaMimeTypes)) {
    return FilmIcon
  }
  return DocumentIcon
}

export const iconForMediaType = (mediaType: MediaType) => {
  if (mediaType === MediaType.Audio) {
    return MusicalNoteIcon
  } else if (mediaType === MediaType.Image) {
    return PhotoIcon
  } else if (mediaType === MediaType.Video) {
    return FilmIcon
  }
  return DocumentIcon
}

export const iconForOperationType = (operationName: FolderOperationName) => {
  switch (operationName) {
    case FolderOperationName.IndexFolderObject:
      return MagnifyingGlassIcon
    case FolderOperationName.TranscribeAudio:
      return ChatBubbleBottomCenterTextIcon
    case FolderOperationName.IndexFolder:
      return MagnifyingGlassIcon
    case FolderOperationName.DetectObjects:
      return CubeIcon
  }
}
