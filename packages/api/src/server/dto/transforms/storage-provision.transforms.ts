import type { StorageProvisionDTO } from '@lombokapp/types'

import type { StorageProvisionInputDTO } from '../storage-provision-input.dto'

export function transformStorageProvisionToDTO(
  storageProvision: StorageProvisionInputDTO & StorageProvisionDTO,
): StorageProvisionDTO {
  return {
    id: storageProvision.id,
    label: storageProvision.label,
    accessKeyId: storageProvision.accessKeyId,
    bucket: storageProvision.bucket,
    accessKeyHashId: storageProvision.accessKeyHashId,
    description: storageProvision.description,
    endpoint: storageProvision.endpoint,
    provisionTypes: storageProvision.provisionTypes,
    region: storageProvision.region,
    prefix: storageProvision.prefix,
  }
}
