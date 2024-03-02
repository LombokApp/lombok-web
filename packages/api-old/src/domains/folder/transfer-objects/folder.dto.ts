import type { TimestampData } from '../../../transfer-objects/timestamps.dto'
import type { StorageLocationData } from '../../storage-location/transfer-objects/s3-location.dto'

export interface FolderData extends TimestampData {
  id: string
  ownerId?: string
  name: string
  metadataLocation: StorageLocationData
  contentLocation: StorageLocationData
}
