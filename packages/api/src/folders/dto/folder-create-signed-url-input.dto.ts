import { SignedURLsRequestMethod } from '@lombokapp/types'
import { objectIdentifierSchema } from '@lombokapp/utils'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const createSignedUrlInputSchema = z.array(
  z.object({
    objectIdentifier: objectIdentifierSchema,
    method: z.enum(SignedURLsRequestMethod),
  }),
)

export class FolderCreateSignedUrlInputDTO extends createZodDto(
  createSignedUrlInputSchema,
) {}
