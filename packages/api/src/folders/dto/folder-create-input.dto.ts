import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { storageLocationInputDTOSchema } from '../../storage/dto/storage-location-input.dto'

export const folderCreateInputDTOSchema = z.object({
  name: z.string().max(256).nonempty(),
  metadataLocation: storageLocationInputDTOSchema,
  contentLocation: storageLocationInputDTOSchema,
})

export class FolderCreateInputDTO extends createZodDto(
  folderCreateInputDTOSchema,
) {}
