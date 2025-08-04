import { createZodDto } from '@anatine/zod-nestjs'
import { SignedURLsRequestMethod } from '@stellariscloud/types'
import { z } from 'zod'

export const createSignedUrlInputSchema = z.array(
  z.object({
    objectIdentifier: z.string(),
    method: z.enum([
      SignedURLsRequestMethod.DELETE,
      SignedURLsRequestMethod.PUT,
      SignedURLsRequestMethod.GET,
      SignedURLsRequestMethod.HEAD,
    ]),
  }),
)

export class FolderCreateSignedUrlInputDTO extends createZodDto(
  createSignedUrlInputSchema,
) {}
