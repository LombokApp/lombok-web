import type { Location } from 'src/locations/entities/location.entity'

import type { LocationDTO } from '../location.dto'

export function transformLocationToDTO(location: Location): LocationDTO {
  return {
    id: location.id,
    label: location.label,
    endpoint: location.endpoint,
    bucket: location.bucket,
    prefix: location.prefix,
    region: location.region,
    userId: location.userId,
    accessKeyId: location.accessKeyId,
  }
}
