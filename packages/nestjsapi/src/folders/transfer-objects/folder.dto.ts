import type { TimestampData } from '../../../transfer-objects/timestamps.dto'
import type { StorageLocationData } from '../../locations/transfer-objects/location.dto'

export interface FolderData extends TimestampData {
  id: string
  ownerId?: string
  name: string
  metadataLocation: StorageLocationData
  contentLocation: StorageLocationData
}
