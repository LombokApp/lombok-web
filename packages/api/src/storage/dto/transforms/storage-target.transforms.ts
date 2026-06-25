import type { FolderStorageTarget } from 'src/folders/entities/folder.entity'
import type { z } from 'zod'

import type { storageTargetDTOSchema } from '../storage-target.dto'

export function transformStorageTargetToDTO(
  target: FolderStorageTarget,
): z.infer<typeof storageTargetDTOSchema> {
  const base = {
    label: target.label,
    endpoint: target.endpoint,
    region: target.region,
    bucket: target.bucket,
    prefix: target.prefix,
    accessKeyId: target.accessKeyId,
    accessKeyHashId: target.accessKeyHashId,
  }
  if (target.kind === 'BUILTIN') {
    return { kind: 'BUILTIN', ...base }
  }
  return {
    kind: target.kind,
    id: target.id,
    userId: target.userId,
    ...base,
  }
}
