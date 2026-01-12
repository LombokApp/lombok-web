import { createZodDto } from '@anatine/zod-nestjs'
import { folderObjectSchema } from '@lombokapp/types'
import { z } from 'zod'

import { mappingExtendedMetadataEntrySchema } from './content-metadata.dto'

export const contentMetadataSchema = z.record(
  z.string(),
  mappingExtendedMetadataEntrySchema.optional(),
)

export class FolderObjectDTO extends createZodDto(folderObjectSchema) {}
