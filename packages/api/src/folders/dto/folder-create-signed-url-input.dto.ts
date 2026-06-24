import { SignedURLsRequestMethod } from '@lombokapp/types'
import { objectIdentifierSchema } from '@lombokapp/utils'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// Discriminated on `method` so the PUT-only `dontReplaceEncodedForwardSlashes`
// flag exists only where it is meaningful. By default PUT replaces "%2F" → "_"
// in the key; `true` presigns the literal key (including any "%2F") unchanged.
// GET/HEAD/DELETE carry no such flag — their keys pass through literally.
export const createSignedUrlInputSchema = z.array(
  z.discriminatedUnion('method', [
    z.object({
      objectIdentifier: objectIdentifierSchema,
      method: z.literal(SignedURLsRequestMethod.PUT),
      dontReplaceEncodedForwardSlashes: z.boolean().optional(),
    }),
    z.object({
      objectIdentifier: objectIdentifierSchema,
      method: z.literal(SignedURLsRequestMethod.GET),
    }),
    z.object({
      objectIdentifier: objectIdentifierSchema,
      method: z.literal(SignedURLsRequestMethod.HEAD),
    }),
    z.object({
      objectIdentifier: objectIdentifierSchema,
      method: z.literal(SignedURLsRequestMethod.DELETE),
    }),
  ]),
)

export class FolderCreateSignedUrlInputDTO extends createZodDto(
  createSignedUrlInputSchema,
) {}
