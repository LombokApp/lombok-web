import type { TimestampData } from '../../../transfer-objects/timestamps.dto'
import type { S3LocationData } from '../../s3/transfer-objects/s3-location.dto'

export interface FolderData extends TimestampData {
  id: string
  ownerId?: string
  name: string
  metadataLocation: S3LocationData
  contentLocation: S3LocationData
}
