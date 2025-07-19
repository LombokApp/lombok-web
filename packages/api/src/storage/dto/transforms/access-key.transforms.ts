import type {
  accessKeyPublicSchema,
  accessKeySchema,
} from '@stellariscloud/types'
import type { z } from 'zod'

export function transformAccessKeyToPublicDTO(
  accessKey: z.infer<typeof accessKeySchema>,
): z.infer<typeof accessKeyPublicSchema> {
  return {
    accessKeyHashId: accessKey.accessKeyHashId,
    accessKeyId: accessKey.accessKeyId,
    region: accessKey.region,
    endpoint: accessKey.endpoint,
    endpointDomain: accessKey.endpointDomain,
    folderCount: accessKey.folderCount,
  }
}
