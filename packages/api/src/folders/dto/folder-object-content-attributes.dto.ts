import { createZodDto } from '@anatine/zod-nestjs'
import { MediaType } from '@stellariscloud/types'
import { z } from 'zod'

export const folderObjectContentAttributesSchema = z.object({
  mediaType: z.nativeEnum(MediaType),
  mimeType: z.string(),
  height: z.number(),
  width: z.number(),
  orientation: z.number(),
  lengthMs: z.number(),
  bitrate: z.number(),
})

export class FolderObjectContentAttributesDTO extends createZodDto(
  folderObjectContentAttributesSchema,
) {}
