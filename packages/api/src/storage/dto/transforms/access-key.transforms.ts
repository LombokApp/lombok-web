import type {
  accessKeySchema,
  accessKeyWithSecretSchema,
} from '@lombokapp/types'
import type { z } from 'zod'

export function transformAccessKeyToDTO(
  accessKey: z.infer<typeof accessKeyWithSecretSchema>,
): z.infer<typeof accessKeySchema> {
  return {
    accessKeyHashId: accessKey.accessKeyHashId,
    accessKeyId: accessKey.accessKeyId,
    secretAccessKey: null,
    region: accessKey.region,
    endpoint: accessKey.endpoint,
    endpointDomain: accessKey.endpointDomain,
    folderCount: accessKey.folderCount,
  }
}
