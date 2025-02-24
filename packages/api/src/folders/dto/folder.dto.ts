import { createZodDto } from '@anatine/zod-nestjs'
import { storageLocationSchema } from 'src/storage/dto/storage-location.dto'
import { z } from 'zod'

export const folderSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  name: z.string(),
  metadataLocation: storageLocationSchema,
  contentLocation: storageLocationSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
})

export class FolderDTO extends createZodDto(folderSchema) {}
