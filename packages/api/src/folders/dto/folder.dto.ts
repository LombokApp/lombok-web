import { createZodDto } from '@anatine/zod-nestjs'
import { locationSchema } from 'src/locations/dto/location.dto'
import { z } from 'zod'

export const folderSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string(),
  metadataLocation: locationSchema,
  contentLocation: locationSchema,
})

export class FolderDTO extends createZodDto(folderSchema) {}
