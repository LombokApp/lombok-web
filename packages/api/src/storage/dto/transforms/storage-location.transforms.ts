import type { StorageLocation } from 'src/storage/entities/storage-location.entity'

import type { StorageLocationDTO } from '../storage-location.dto'

export function transformStorageLocationToDTO(
  storageLocation: StorageLocation,
): StorageLocationDTO {
  return {
    id: storageLocation.id,
    label: storageLocation.label,
    endpoint: storageLocation.endpoint,
    providerType: storageLocation.providerType,
    bucket: storageLocation.bucket,
    prefix: storageLocation.prefix,
    region: storageLocation.region,
    userId: storageLocation.userId,
    accessKeyId: storageLocation.accessKeyId,
    accessKeyHashId: storageLocation.accessKeyHashId,
  }
}
