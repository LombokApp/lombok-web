export enum ImageMediaMimeTypes {
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  GIF = 'image/gif',
  HEIC = 'image/heic',
  BMP = 'image/bmp',
  AVIF = 'image/avif',
  TIFF = 'image/tiff',
  SVG = 'image/svg+xml',
  WEBP = 'image/webp',
  RAW = 'image/x-dcraw',
  SONY_RAW = 'image/x-sony-arw',
}

export enum VideoMediaMimeTypes {
  MKV = 'video/x-matroska',
  FLV = 'video/x-flv',
  MP4 = 'video/mp4',
  AVI = 'video/x-msvideo',
  MOV = 'video/quicktime',
  WEBM = 'video/webm',
  MPEG = 'video/mpeg',
  THREEGPP = 'video/3gpp',
  THREEGPP2 = 'video/3gpp2',
}

export enum AudioMediaMimeTypes {
  AAC = 'audio/aac',
  WAV = 'audio/wav',
  WEBM = 'audio/webm',
  MIDI = 'audio/midi',
  MPEG = 'audio/mpeg',
  OGG = 'audio/ogg',
  THREEGPP = 'audio/3gpp',
  THREEGPP2 = 'audio/3gpp2',
}

export enum DocumentMediaMimeTypes {
  TXT = 'text/plain',
  PDF = 'application/pdf',
  JSON = 'application/json',
  XLS = 'application/vnd.ms-excel',
  XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  HTML = 'text/html',
  DOC = 'application/msword',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export const IMAGE_MEDIA_MIME_TYPES = [
  ImageMediaMimeTypes.JPEG,
  ImageMediaMimeTypes.PNG,
  ImageMediaMimeTypes.HEIC,
  ImageMediaMimeTypes.GIF,
  ImageMediaMimeTypes.BMP,
  ImageMediaMimeTypes.AVIF,
  ImageMediaMimeTypes.TIFF,
  ImageMediaMimeTypes.SVG,
  ImageMediaMimeTypes.WEBP,
]
export const VIDEO_MEDIA_MIME_TYPES = [
  VideoMediaMimeTypes.FLV,
  VideoMediaMimeTypes.MKV,
  VideoMediaMimeTypes.MP4,
  VideoMediaMimeTypes.AVI,
  VideoMediaMimeTypes.MOV,
  VideoMediaMimeTypes.WEBM,
  VideoMediaMimeTypes.MPEG,
  VideoMediaMimeTypes.THREEGPP,
  VideoMediaMimeTypes.THREEGPP2,
]
export const AUDIO_MEDIA_MIME_TYPES = [
  AudioMediaMimeTypes.AAC,
  AudioMediaMimeTypes.WAV,
  AudioMediaMimeTypes.WEBM,
  AudioMediaMimeTypes.MIDI,
  AudioMediaMimeTypes.MPEG,
  AudioMediaMimeTypes.OGG,
  AudioMediaMimeTypes.THREEGPP,
  AudioMediaMimeTypes.THREEGPP2,
]
export const DOCUMENT_MEDIA_MIME_TYPES = [
  DocumentMediaMimeTypes.TXT,
  DocumentMediaMimeTypes.PDF,
  DocumentMediaMimeTypes.XLS,
  DocumentMediaMimeTypes.XLSX,
  DocumentMediaMimeTypes.HTML,
  DocumentMediaMimeTypes.DOC,
  DocumentMediaMimeTypes.JSON,
  DocumentMediaMimeTypes.DOCX,
]

export const MIME_TYPE_TO_EXTENSION_MAP = {
  [ImageMediaMimeTypes.JPEG]: 'jpeg',
  [ImageMediaMimeTypes.BMP]: 'bmp',
  [ImageMediaMimeTypes.GIF]: 'gif',
  [ImageMediaMimeTypes.HEIC]: 'heic',
  [ImageMediaMimeTypes.PNG]: 'png',
  [ImageMediaMimeTypes.AVIF]: 'avif',
  [ImageMediaMimeTypes.RAW]: 'raw',
  [ImageMediaMimeTypes.SONY_RAW]: 'arw',
  [ImageMediaMimeTypes.TIFF]: 'tiff',
  [ImageMediaMimeTypes.WEBP]: 'webp',

  [VideoMediaMimeTypes.AVI]: 'avi',
  [VideoMediaMimeTypes.MKV]: 'mkv',
  [VideoMediaMimeTypes.MP4]: 'mp4',
  [VideoMediaMimeTypes.FLV]: 'flv',
  [VideoMediaMimeTypes.MOV]: 'mov',
  [VideoMediaMimeTypes.MPEG]: 'mpeg',
  [VideoMediaMimeTypes.WEBM]: 'webm',
  [VideoMediaMimeTypes.THREEGPP]: '3ggp',
  [VideoMediaMimeTypes.THREEGPP2]: '3ggp2',

  [AudioMediaMimeTypes.AAC]: 'aac',
  [AudioMediaMimeTypes.MIDI]: 'midi',
  [AudioMediaMimeTypes.MPEG]: 'mp3',
  [AudioMediaMimeTypes.OGG]: 'ogg',
  [AudioMediaMimeTypes.WAV]: 'wav',
  [AudioMediaMimeTypes.WEBM]: 'webm',
  [AudioMediaMimeTypes.THREEGPP]: '3gpp',
  [AudioMediaMimeTypes.THREEGPP2]: '3gpp2',

  [DocumentMediaMimeTypes.TXT]: 'txt',
  [DocumentMediaMimeTypes.PDF]: 'pdf',
  [DocumentMediaMimeTypes.XLS]: 'xls',
  [DocumentMediaMimeTypes.XLSX]: 'xlsx',
  [DocumentMediaMimeTypes.HTML]: 'html',
  [DocumentMediaMimeTypes.DOC]: 'doc',
  [DocumentMediaMimeTypes.DOCX]: 'docx',
  [DocumentMediaMimeTypes.JSON]: 'json',
}

export const EXTENSION_TO_MIME_TYPE_MAP: {
  [key: string]: ImageMediaMimeTypes | VideoMediaMimeTypes | AudioMediaMimeTypes
} = Object.keys(MIME_TYPE_TO_EXTENSION_MAP).reduce(
  (acc, next) => {
    return {
      ...acc,
      [MIME_TYPE_TO_EXTENSION_MAP[
        next as keyof typeof MIME_TYPE_TO_EXTENSION_MAP
      ]]: next,
    }
  },
  { jpg: ImageMediaMimeTypes.JPEG },
)
