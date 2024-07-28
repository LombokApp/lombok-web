import { createZodDto } from '@anatine/zod-nestjs'
import { storageLocationSchema } from 'src/storage/dto/storage-location.dto'
import { z } from 'zod'

export const folderSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string(),
  metadataLocation: storageLocationSchema,
  contentLocation: storageLocationSchema,
})

export class FolderDTO extends createZodDto(folderSchema) {}
