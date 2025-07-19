import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

const serverStorageLocationInputSchema = z.object({
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  endpoint: z
    .string()
    .url()
    .refine(
      (e) => {
        try {
          return new URL(e).pathname === '/'
        } catch {
          return false
        }
      },
      {
        message: 'Expected hostname but got URL.',
      },
    ),
  bucket: z.string().min(1),
  region: z.string().min(1),
  prefix: z.string().nonempty().nullable(),
})

export class ServerStorageLocationInputDTO extends createZodDto(
  serverStorageLocationInputSchema,
) {}
