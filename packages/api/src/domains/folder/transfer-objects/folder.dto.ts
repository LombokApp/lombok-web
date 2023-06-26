import type { TimestampData } from '../../../transfer-objects/timestamps.dto'

export interface FolderData extends TimestampData {
  id: string
  ownerId?: string

  name: string

  accessKeyId: string
  endpoint: string
  region?: string

  bucket: string
  prefix?: string
}

export interface FolderPublicData {
  name: string
  endpoint: string
  bucket: string
  prefix?: string
  region?: string
}
