import type { UserStorageProvisionDTO } from '@stellariscloud/types'

import type { UserStorageProvisionInputDTO } from '../user-storage-provision-input.dto'

export function transformUserStorageProvisionToDTO(
  storageProvision: UserStorageProvisionInputDTO & UserStorageProvisionDTO,
): UserStorageProvisionDTO {
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
