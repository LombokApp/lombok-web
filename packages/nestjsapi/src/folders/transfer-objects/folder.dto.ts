import { TimestampDTO } from 'src/core/transfer-objects/timestamps.dto'
import type { LocationDTO } from 'src/locations/transfer-objects/location.dto'

export class FolderDTO extends TimestampDTO {
  id: string
  ownerId?: string
  name: string
  metadataLocation: LocationDTO
  contentLocation: LocationDTO
}
