import type { FolderOperationName } from '@stellariscloud/workers'

import type { TimestampData } from '../../../transfer-objects/timestamps.dto'

export interface FolderOperationData extends TimestampData {
  id: string
  operationName: FolderOperationName
  operationData: { [key: string]: any }
}
