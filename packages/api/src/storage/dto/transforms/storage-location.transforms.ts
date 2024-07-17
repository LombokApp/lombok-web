import type { StorageLocation } from 'src/storage/entities/storage-location.entity'

import type { StorageLocationDTO } from '../storage-location.dto'

export function transformStorageLocationToDTO(
  location: StorageLocation,
): StorageLocationDTO {
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
