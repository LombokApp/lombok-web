import type { TimestampDTO } from 'src/core/transfer-objects/timestamps.dto'

export interface LocationDTO extends TimestampDTO {
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
