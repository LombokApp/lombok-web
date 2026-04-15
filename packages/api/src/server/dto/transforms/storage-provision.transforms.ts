import type {
  StorageProvision,
  StorageProvisionWithSecret,
} from '@lombokapp/types'

export function transformStorageProvisionToDTO(
  storageProvision: StorageProvisionWithSecret,
): StorageProvision {
  return {
    id: storageProvision.id,
    label: storageProvision.label,
    accessKeyId: storageProvision.accessKeyId,
    bucket: storageProvision.bucket,
    accessKeyHashId: storageProvision.accessKeyHashId,
    secretAccessKey: null,
    description: storageProvision.description,
    endpoint: storageProvision.endpoint,
    provisionTypes: storageProvision.provisionTypes,
    region: storageProvision.region,
    prefix: storageProvision.prefix,
  }
}
