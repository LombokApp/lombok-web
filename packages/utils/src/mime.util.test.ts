import { MediaType } from '@lombokapp/types'
import { describe, expect, it } from 'bun:test'

import {
  extensionFromMimeType,
  mediaTypeFromExtension,
  mediaTypeFromMimeType,
  mimeFromExtension,
} from './mime.util'

describe('mimeFromExtension', () => {
  it('resolves common image extensions', () => {
    expect(mimeFromExtension('jpg')).toBe('image/jpeg')
    expect(mimeFromExtension('jpeg')).toBe('image/jpeg')
    expect(mimeFromExtension('png')).toBe('image/png')
    expect(mimeFromExtension('gif')).toBe('image/gif')
    expect(mimeFromExtension('webp')).toBe('image/webp')
    expect(mimeFromExtension('svg')).toBe('image/svg+xml')
  })

  it('resolves common video extensions', () => {
    expect(mimeFromExtension('mp4')).toBe('video/mp4')
    expect(mimeFromExtension('mov')).toBe('video/quicktime')
    expect(mimeFromExtension('avi')).toBe('video/x-msvideo')
    expect(mimeFromExtension('mkv')).toBe('video/x-matroska')
    expect(mimeFromExtension('webm')).toBe('video/webm')
  })

  it('resolves common audio extensions', () => {
    expect(mimeFromExtension('mp3')).toBe('audio/mpeg')
    expect(mimeFromExtension('wav')).toBe('audio/wav')
    expect(mimeFromExtension('ogg')).toBe('audio/ogg')
    expect(mimeFromExtension('aac')).toBe('audio/aac')
  })

  it('resolves m4a to audio/mp4', () => {
    expect(mimeFromExtension('m4a')).toBe('audio/mp4')
  })

  it('resolves common document extensions', () => {
    expect(mimeFromExtension('pdf')).toBe('application/pdf')
    expect(mimeFromExtension('json')).toBe('application/json')
    expect(mimeFromExtension('html')).toBe('text/html')
    expect(mimeFromExtension('txt')).toBe('text/plain')
    expect(mimeFromExtension('xml')).toBe('application/xml')
  })

  it('resolves RAW photo extensions via custom types', () => {
    expect(mimeFromExtension('arw')).toBe('image/x-sony-arw')
    expect(mimeFromExtension('cr2')).toBe('image/x-canon-cr2')
    expect(mimeFromExtension('nef')).toBe('image/x-nikon-nef')
  })

  it('returns null for unknown extensions', () => {
    expect(mimeFromExtension('xyz123')).toBeNull()
  })

  it('maps empty string to video/mp2t (explicit override)', () => {
    expect(mimeFromExtension('')).toBe('video/mp2t')
  })
})

describe('mediaTypeFromMimeType', () => {
  describe('IMAGE', () => {
    it.each([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/heic',
      'image/bmp',
      'image/avif',
      'image/tiff',
      'image/svg+xml',
      'image/webp',
      // types the old hand-maintained array omitted
      'image/x-sony-arw',
      'image/x-dcraw',
      'image/x-icon',
      'image/heif',
    ])('classifies %s as IMAGE', (mime) => {
      expect(mediaTypeFromMimeType(mime)).toBe(MediaType.IMAGE)
    })
  })

  describe('VIDEO', () => {
    it.each([
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/webm',
      'video/mpeg',
      'video/x-flv',
      'video/3gpp',
      'video/3gpp2',
    ])('classifies %s as VIDEO', (mime) => {
      expect(mediaTypeFromMimeType(mime)).toBe(MediaType.VIDEO)
    })
  })

  describe('AUDIO', () => {
    it.each([
      'audio/mpeg',
      'audio/wav',
      'audio/mp4',
      'audio/x-m4a',
      'audio/x-wav',
      'audio/aac',
      'audio/ogg',
      'audio/webm',
      'audio/midi',
      'audio/3gpp',
      'audio/3gpp2',
      'audio/flac',
    ])('classifies %s as AUDIO', (mime) => {
      expect(mediaTypeFromMimeType(mime)).toBe(MediaType.AUDIO)
    })
  })

  describe('DOCUMENT', () => {
    it.each([
      'application/pdf',
      'application/json',
      'text/plain',
      'text/html',
      'application/xml',
      'application/epub+zip',
      'application/msword',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // any text/* is a document; param-stripping
      'text/css',
      'text/markdown',
      'text/plain; charset=utf-8',
    ])('classifies %s as DOCUMENT', (mime) => {
      expect(mediaTypeFromMimeType(mime)).toBe(MediaType.DOCUMENT)
    })
  })

  describe('OTHER', () => {
    it('returns OTHER for unrecognised MIME types', () => {
      expect(mediaTypeFromMimeType('application/octet-stream')).toBe(
        MediaType.OTHER,
      )
      expect(mediaTypeFromMimeType('application/zip')).toBe(MediaType.OTHER)
      expect(mediaTypeFromMimeType('application/wasm')).toBe(MediaType.OTHER)
      expect(mediaTypeFromMimeType('')).toBe(MediaType.OTHER)
      expect(mediaTypeFromMimeType('notamimetype')).toBe(MediaType.OTHER)
    })
  })
})

describe('mediaTypeFromExtension', () => {
  it('classifies image extensions', () => {
    expect(mediaTypeFromExtension('jpeg')).toBe(MediaType.IMAGE)
    expect(mediaTypeFromExtension('png')).toBe(MediaType.IMAGE)
    expect(mediaTypeFromExtension('gif')).toBe(MediaType.IMAGE)
    expect(mediaTypeFromExtension('webp')).toBe(MediaType.IMAGE)
    expect(mediaTypeFromExtension('jpg')).toBe(MediaType.IMAGE)
    expect(mediaTypeFromExtension('arw')).toBe(MediaType.IMAGE)
  })

  it('classifies video extensions', () => {
    expect(mediaTypeFromExtension('mp4')).toBe(MediaType.VIDEO)
    expect(mediaTypeFromExtension('mov')).toBe(MediaType.VIDEO)
    expect(mediaTypeFromExtension('avi')).toBe(MediaType.VIDEO)
    expect(mediaTypeFromExtension('mkv')).toBe(MediaType.VIDEO)
  })

  it('classifies audio extensions', () => {
    expect(mediaTypeFromExtension('mp3')).toBe(MediaType.AUDIO)
    expect(mediaTypeFromExtension('wav')).toBe(MediaType.AUDIO)
    expect(mediaTypeFromExtension('ogg')).toBe(MediaType.AUDIO)
    expect(mediaTypeFromExtension('aac')).toBe(MediaType.AUDIO)
    expect(mediaTypeFromExtension('m4a')).toBe(MediaType.AUDIO)
  })

  it('classifies document extensions', () => {
    expect(mediaTypeFromExtension('pdf')).toBe(MediaType.DOCUMENT)
    expect(mediaTypeFromExtension('json')).toBe(MediaType.DOCUMENT)
    expect(mediaTypeFromExtension('html')).toBe(MediaType.DOCUMENT)
    expect(mediaTypeFromExtension('txt')).toBe(MediaType.DOCUMENT)
  })

  it('is case-insensitive', () => {
    expect(mediaTypeFromExtension('PDF')).toBe(MediaType.DOCUMENT)
    expect(mediaTypeFromExtension('MP3')).toBe(MediaType.AUDIO)
    expect(mediaTypeFromExtension('Jpg')).toBe(MediaType.IMAGE)
  })

  it('returns OTHER for unrecognised extensions', () => {
    expect(mediaTypeFromExtension('xyz')).toBe(MediaType.OTHER)
    expect(mediaTypeFromExtension('zzz')).toBe(MediaType.OTHER)
  })
})

describe('extensionFromMimeType', () => {
  it('returns the canonical extension for known MIME types', () => {
    expect(extensionFromMimeType('image/jpeg')).toBe('jpg')
    expect(extensionFromMimeType('image/png')).toBe('png')
    expect(extensionFromMimeType('video/mp4')).toBe('mp4')
    expect(extensionFromMimeType('audio/mpeg')).toBe('mp3')
    expect(extensionFromMimeType('audio/mp4')).toBe('m4a')
    expect(extensionFromMimeType('application/pdf')).toBe('pdf')
  })

  it('returns undefined for unknown MIME types', () => {
    expect(extensionFromMimeType('unknown/type')).toBeUndefined()
  })
})
