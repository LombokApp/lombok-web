import { folderObjectSchema, metadataEntrySchema } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const contentMetadataSchema = z.record(
  z.string(),
  metadataEntrySchema.optional(),
)

export class FolderObjectDTO extends createZodDto(folderObjectSchema) {}
