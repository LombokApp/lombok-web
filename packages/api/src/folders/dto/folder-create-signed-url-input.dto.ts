import { SignedURLsRequestMethod } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const createSignedUrlInputSchema = z.array(
  z.object({
    objectIdentifier: z.string(),
    method: z.enum(SignedURLsRequestMethod),
  }),
)

export class FolderCreateSignedUrlInputDTO extends createZodDto(
  createSignedUrlInputSchema,
) {}
