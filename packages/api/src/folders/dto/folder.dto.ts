import { createZodDto } from 'nestjs-zod'
import { imageUrlsDTOSchema } from 'src/shared/dto/image-urls.dto'
import { storageLocationDTOSchema } from 'src/storage/dto/storage-location.dto'
import { z } from 'zod'

export const folderDTOSchema = z
  .object({
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
    icon: imageUrlsDTOSchema.optional(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: 'Folder' })

export class FolderDTO extends createZodDto(folderDTOSchema) {}
