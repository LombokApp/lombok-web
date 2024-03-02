import type { StorageLocation } from '../entities/storage-location.entity'
import type { StorageLocationData } from '../transfer-objects/s3-location.dto'

export const transformStorageLocationToStorageLocationDTO = (
  storageLocation: StorageLocation,
): StorageLocationData => ({
  id: storageLocation.id,
  name: storageLocation.name,
  providerType: storageLocation.providerType,
  endpoint: storageLocation.endpoint,
  region: storageLocation.region,
  accessKeyId: storageLocation.accessKeyId,
  bucket: storageLocation.bucket,
  prefix: storageLocation.prefix,
  createdAt: storageLocation.createdAt,
  updatedAt: storageLocation.updatedAt,
})
