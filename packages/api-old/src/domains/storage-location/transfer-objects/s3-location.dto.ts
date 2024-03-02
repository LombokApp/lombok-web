import type { TimestampData } from '../../../transfer-objects/timestamps.dto'

export interface StorageLocationData extends TimestampData {
  id: string
  userId?: string
  providerType: 'SERVER' | 'USER'
  name: string
  endpoint: string
  region?: string
  bucket: string
  prefix?: string
  accessKeyId: string
}

export interface ServerLocationData {
  id: string
  name: string
  endpoint: string
  accessKeyId: string
  region: string
  bucket: string
  prefix?: string
}

export interface ServerLocationInputData {
  name: string
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  region: string
  bucket: string
  prefix?: string
}

export interface UserLocationInputData {
  serverLocationId?: string

  userLocationId?: string
  userLocationBucketOverride?: string
  userLocationPrefixOverride?: string

  accessKeyId?: string
  secretAccessKey?: string
  endpoint?: string
  bucket?: string
  region?: string
  prefix?: string
}
