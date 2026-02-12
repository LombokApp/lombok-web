import { createZodDto } from 'nestjs-zod'
import { storageLocationDTOSchema } from 'src/storage/dto/storage-location.dto'
import { z } from 'zod'

export const folderDTOSchema = z.object({
  id: z.guid(),
  ownerId: z.guid(),
  name: z.string(),
  metadataLocation: storageLocationDTOSchema,
  contentLocation: storageLocationDTOSchema,
  accessError: z
    .object({
      message: z.string(),
      code: z.string(),
    })
    .nullish(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export class FolderDTO extends createZodDto(folderDTOSchema) {}
