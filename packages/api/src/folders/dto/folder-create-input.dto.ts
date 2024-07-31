import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { folderLocationInputSchema } from './folder-location-input.dto'

export const folderCreateInputSchema = z.object({
  name: z.string(),
  metadataLocation: folderLocationInputSchema,
  contentLocation: folderLocationInputSchema,
})

export class FolderCreateInputDTO extends createZodDto(
  folderCreateInputSchema,
) {}
