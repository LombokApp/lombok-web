import type { TimestampData } from '../../../transfer-objects/timestamps.dto'

export interface ObjectTagData extends TimestampData {
  id: string
  name: string
}
