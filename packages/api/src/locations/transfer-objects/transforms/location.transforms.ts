import type { Location } from 'src/locations/entities/locations.entity'

import type { LocationDTO } from '../location.dto'

export function transformLocationToDTO(location: Location): LocationDTO {
  return {
    id: location.id,
    name: location.name,
    endpoint: location.endpoint,
    bucket: location.bucket,
    prefix: location.prefix,
    region: location.region,
    userId: location.userId,
    accessKeyId: location.accessKeyId,
  }
}
