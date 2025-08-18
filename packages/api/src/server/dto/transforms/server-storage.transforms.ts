import type { ServerStorageDTO } from '@stellariscloud/types'

import type { ServerStorageInputDTO } from '../server-storage-input.dto'

export function transformServerStorageToDTO(
  serverStorageLocation: ServerStorageDTO & ServerStorageInputDTO,
): ServerStorageDTO {
  return {
    accessKeyId: serverStorageLocation.accessKeyId,
    bucket: serverStorageLocation.bucket,
    accessKeyHashId: serverStorageLocation.accessKeyHashId,
    endpoint: serverStorageLocation.endpoint,
    region: serverStorageLocation.region,
    prefix: serverStorageLocation.prefix,
  }
}
