import type { ServerStorageWithSecret } from '@lombokapp/types'
import { InternalServerErrorException } from '@nestjs/common'
import type { StorageProvisionService } from 'src/server/services/storage-provision.service'

/**
 * Resolve the embedded server storage (credentials + endpoint). The embedded
 * service is always present, so a missing value is an internal invariant
 * violation rather than an admin-configurable state.
 */
export async function requireServerStorage(
  storageProvisionService: StorageProvisionService,
): Promise<ServerStorageWithSecret> {
  const serverStorage = await storageProvisionService.getServerStorage()
  if (!serverStorage) {
    throw new InternalServerErrorException('Server storage unavailable')
  }
  return serverStorage
}
