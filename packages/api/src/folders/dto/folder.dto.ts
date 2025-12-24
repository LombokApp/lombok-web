import { createZodDto } from '@anatine/zod-nestjs'
import { storageLocationDTOSchema } from 'src/storage/dto/storage-location.dto'
import { z } from 'zod'

export const folderDTOSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  name: z.string(),
  metadataLocation: storageLocationDTOSchema,
  contentLocation: storageLocationDTOSchema,
  accessError: z
    .object({
      message: z.string(),
      code: z.string(),
    })
    .nullish(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export class FolderDTO extends createZodDto(folderDTOSchema) {}
