import type { z } from 'zod'

import type {
  AccessKeyPublicDTO,
  accessKeyPublicSchema,
} from '../access-key-public.dto'

export function transformAccessKeyToPublicDTO(
  accessKey: z.infer<typeof accessKeyPublicSchema>,
): AccessKeyPublicDTO {
  return {
    accessKeyHashId: accessKey.accessKeyHashId,
    accessKeyId: accessKey.accessKeyId,
    region: accessKey.region,
    endpoint: accessKey.endpoint,
    endpointDomain: accessKey.endpointDomain,
    folderCount: accessKey.folderCount,
  }
}
