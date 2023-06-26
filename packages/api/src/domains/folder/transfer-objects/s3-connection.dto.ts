import type { TimestampData } from '../../../transfer-objects/timestamps.dto'

export interface S3ConnectionData extends TimestampData {
  id: string
  ownerId?: string
  name: string
  accessKeyId: string
  endpoint: string
  region?: string
}
