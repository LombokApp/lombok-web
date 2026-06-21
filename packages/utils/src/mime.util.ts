import { Mime } from 'mime'
import otherTypes from 'mime/types/other.js'
import standardTypes from 'mime/types/standard.js'

import { MediaType } from '../../types'
import { DocumentMediaMimeTypes } from './constants'

const mime = new Mime({
  ...standardTypes,
  ...otherTypes,
  'video/mp2t': [''],
  'text/typescript': ['ts'],
  // RAW photo types missing from mime-db; adding them lets ext→mime resolve and
  // the image/ prefix rule classify them.
  'image/x-sony-arw': ['arw'],
  'image/x-dcraw': ['raw'],
  'image/x-canon-cr2': ['cr2'],
  'image/x-nikon-nef': ['nef'],
})

// Force-pin canonical extensions; without this getExtension returns mime-db's
// first alias (e.g. audio/mpeg → 'mpga' instead of 'mp3').
mime.define(
  {
    'audio/mpeg': ['mp3', 'mpga', 'mp2', 'mp2a', 'm2a', 'm3a'],
    'image/jpeg': ['jpg', 'jpeg', 'jpe'],
  },
  true,
)

// Curated application/* document types. text/* is handled by the prefix rule.
const APPLICATION_DOCUMENT_MIME_TYPES = new Set<string>([
  ...Object.values(DocumentMediaMimeTypes).filter((m) =>
    m.startsWith('application/'),
  ),
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
  'application/rtf',
])

export const mimeFromExtension = (extension: string) => {
  return mime.getType(extension)
}

export const mediaTypeFromMimeType = (mimeType: string): MediaType => {
  const normalized = mimeType.split(';')[0]?.trim().toLowerCase() ?? ''
  const slash = normalized.indexOf('/')
  if (slash < 0) {
    return MediaType.OTHER
  }
  const topLevel = normalized.slice(0, slash)
  if (topLevel === 'image') {
    return MediaType.IMAGE
  }
  if (topLevel === 'video') {
    return MediaType.VIDEO
  }
  if (topLevel === 'audio') {
    return MediaType.AUDIO
  }
  if (topLevel === 'text') {
    return MediaType.DOCUMENT
  }
  if (APPLICATION_DOCUMENT_MIME_TYPES.has(normalized)) {
    return MediaType.DOCUMENT
  }
  return MediaType.OTHER
}

export const mediaTypeFromExtension = (extension: string): MediaType =>
  mediaTypeFromMimeType(mimeFromExtension(extension) ?? '')

export const isRenderableTextMimeType = (mimeType: string) => {
  // Check specific document types that are renderable
  if (
    mimeType === String(DocumentMediaMimeTypes.TXT) ||
    mimeType === String(DocumentMediaMimeTypes.HTML) ||
    mimeType === String(DocumentMediaMimeTypes.JSON) ||
    mimeType === String(DocumentMediaMimeTypes.CSV) ||
    mimeType === String(DocumentMediaMimeTypes.TSV) ||
    mimeType === String(DocumentMediaMimeTypes.MPD) ||
    mimeType === String(DocumentMediaMimeTypes.M3U8)
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
    mimeType === String(DocumentMediaMimeTypes.PDF) ||
    mimeType === String(DocumentMediaMimeTypes.CSV) ||
    mimeType === String(DocumentMediaMimeTypes.TSV) ||
    mimeType === String(DocumentMediaMimeTypes.MPD) ||
    mimeType === String(DocumentMediaMimeTypes.M3U8)
  ) {
    return true
  }

  return false
}

export const extensionFromMimeType = (mimeType: string): string | undefined =>
  mime.getExtension(mimeType) ?? undefined

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
