import type { ServerStorageLocation } from '@lombokapp/types'

import type { ServerStorageInputDTO } from '../server-storage-input.dto'

export function transformServerStorageToDTO(
  serverStorageLocation: ServerStorageLocation & ServerStorageInputDTO,
): ServerStorageLocation {
  return {
    accessKeyId: serverStorageLocation.accessKeyId,
    bucket: serverStorageLocation.bucket,
    accessKeyHashId: serverStorageLocation.accessKeyHashId,
    endpoint: serverStorageLocation.endpoint,
    region: serverStorageLocation.region,
    prefix: serverStorageLocation.prefix,
  }
}
