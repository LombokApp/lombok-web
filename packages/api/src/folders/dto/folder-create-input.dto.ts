import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { storageTargetInputDTOSchema } from '../../storage/dto/storage-target-input.dto'

export const folderCreateInputDTOSchema = z.object({
  name: z.string().max(256).nonempty(),
  metadataLocation: storageTargetInputDTOSchema,
  contentLocation: storageTargetInputDTOSchema,
})

export class FolderCreateInputDTO extends createZodDto(
  folderCreateInputDTOSchema,
) {}
