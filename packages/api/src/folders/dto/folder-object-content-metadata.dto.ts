import { createZodDto } from '@anatine/zod-nestjs'
import { metadataEntrySchema } from '@stellariscloud/types'

export class FolderObjectContentMetadataDTO extends createZodDto(
  metadataEntrySchema,
) {}
