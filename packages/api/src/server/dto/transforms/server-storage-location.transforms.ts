import type { ServerStorageLocationDTO } from '@stellariscloud/types'

import type { ServerStorageLocationInputDTO } from '../server-storage-location-input.dto'

export function transformServerStorageLocationToDTO(
  serverStorageLocation: ServerStorageLocationDTO &
    ServerStorageLocationInputDTO,
): ServerStorageLocationDTO {
  return {
    accessKeyId: serverStorageLocation.accessKeyId,
    bucket: serverStorageLocation.bucket,
    accessKeyHashId: serverStorageLocation.accessKeyHashId,
    endpoint: serverStorageLocation.endpoint,
    region: serverStorageLocation.region,
    prefix: serverStorageLocation.prefix,
  }
}
