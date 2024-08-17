import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { storageLocationInputSchema } from '../../storage/dto/storage-location-input.dto'

export const folderCreateInputSchema = z.object({
  name: z.string(),
  metadataLocation: storageLocationInputSchema,
  contentLocation: storageLocationInputSchema,
})

export class FolderCreateInputDTO extends createZodDto(
  folderCreateInputSchema,
) {}
