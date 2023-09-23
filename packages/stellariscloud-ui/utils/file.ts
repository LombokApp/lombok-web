import {
  DocumentIcon,
  FilmIcon,
  MusicalNoteIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'
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

export const downloadData = (downloadURL: string, name: string) => {
  // Convert your blob into a Blob URL (a special url that points to an object in the browser's memory)

  // Create a link element
  const link = document.createElement('a')

  // Set link's href to point to the Blob URL
  link.href = downloadURL
  link.download = name

  // Append link to the body
  document.body.appendChild(link)

  // Dispatch click event on the link
  // This is necessary as link.click() does not work on the latest firefox
  link.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
    }),
  )

  // Remove link from body
  document.body.removeChild(link)
}

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
