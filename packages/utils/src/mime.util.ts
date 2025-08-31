import { MediaType } from '../../types'
import type {
  AudioMediaMimeTypes,
  ImageMediaMimeTypes,
  VideoMediaMimeTypes,
} from './constants'
import {
  AUDIO_MEDIA_MIME_TYPES,
  DOCUMENT_MEDIA_MIME_TYPES,
  DocumentMediaMimeTypes,
  EXTENSION_TO_MIME_TYPE_MAP,
  IMAGE_MEDIA_MIME_TYPES,
  MIME_TYPE_TO_EXTENSION_MAP,
  VIDEO_MEDIA_MIME_TYPES,
} from './constants'

export const mediaTypeFromMimeType = (mimeType: string) => {
  if (IMAGE_MEDIA_MIME_TYPES.includes(mimeType as ImageMediaMimeTypes)) {
    return MediaType.Image
  } else if (VIDEO_MEDIA_MIME_TYPES.includes(mimeType as VideoMediaMimeTypes)) {
    return MediaType.Video
  } else if (AUDIO_MEDIA_MIME_TYPES.includes(mimeType as AudioMediaMimeTypes)) {
    return MediaType.Audio
  } else if (
    DOCUMENT_MEDIA_MIME_TYPES.includes(mimeType as DocumentMediaMimeTypes)
  ) {
    return MediaType.Document
  }
  return MediaType.Unknown
}

export const mediaTypeFromExtension = (extension: string) => {
  const mimeType = EXTENSION_TO_MIME_TYPE_MAP[extension.toLowerCase()]
  if (!mimeType) {
    return MediaType.Unknown
  }
  if (IMAGE_MEDIA_MIME_TYPES.includes(mimeType as ImageMediaMimeTypes)) {
    return MediaType.Image
  } else if (VIDEO_MEDIA_MIME_TYPES.includes(mimeType as VideoMediaMimeTypes)) {
    return MediaType.Video
  } else if (AUDIO_MEDIA_MIME_TYPES.includes(mimeType as AudioMediaMimeTypes)) {
    return MediaType.Audio
  } else if (
    DOCUMENT_MEDIA_MIME_TYPES.includes(mimeType as DocumentMediaMimeTypes)
  ) {
    return MediaType.Document
  }
  return MediaType.Unknown
}

export const isRenderableTextMimeType = (mimeType: string) => {
  // Check specific document types that are renderable
  if (
    mimeType === String(DocumentMediaMimeTypes.TXT) ||
    mimeType === String(DocumentMediaMimeTypes.HTML) ||
    mimeType === String(DocumentMediaMimeTypes.JSON)
  ) {
    return true
  }

  // PDF and office documents are not directly renderable in webpages
  return false
}

export const isRenderableDocumentMimeType = (mimeType: string) => {
  // Check specific document types that are renderable
  if (
    mimeType === String(DocumentMediaMimeTypes.TXT) ||
    mimeType === String(DocumentMediaMimeTypes.HTML) ||
    mimeType === String(DocumentMediaMimeTypes.JSON) ||
    mimeType === String(DocumentMediaMimeTypes.PDF)
  ) {
    return true
  }

  return false
}

export const extensionFromMimeType = (mimeType: string): string | undefined => {
  return MIME_TYPE_TO_EXTENSION_MAP[
    mimeType as keyof typeof MIME_TYPE_TO_EXTENSION_MAP
  ]
}

export const documentLabelFromMimeType = (
  mimeType: string | undefined,
): string | undefined => {
  if (!mimeType) {
    return undefined
  }

  switch (mimeType) {
    case String(DocumentMediaMimeTypes.PDF):
      return 'PDF'
    case String(DocumentMediaMimeTypes.DOC):
      return 'DOC'
    case String(DocumentMediaMimeTypes.DOCX):
      return 'DOCX'
    case String(DocumentMediaMimeTypes.XLS):
      return 'XLS'
    case String(DocumentMediaMimeTypes.XLSX):
      return 'XLSX'
    case String(DocumentMediaMimeTypes.JSON):
      return 'JSON'
    case String(DocumentMediaMimeTypes.HTML):
      return 'HTML'
    case String(DocumentMediaMimeTypes.XML):
      return 'XML'
    case String(DocumentMediaMimeTypes.TXT):
      return 'TXT'
    case String(DocumentMediaMimeTypes.EPUB):
      return 'EPUB'
    default:
      if (mimeType.startsWith('text/')) {
        return 'TEXT'
      }
      return undefined
  }
}
