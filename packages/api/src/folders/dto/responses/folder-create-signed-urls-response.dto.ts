import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export class FolderCreateSignedUrlsResponse extends createZodDto(
  z.object({
    urls: z.array(
      z.object({
        // The presigned URL.
        url: z.string(),
        // The resolved object key the URL targets. Reflects any PUT "%2F"
        // replacement; equals the input key for GET/HEAD.
        objectKey: z.string(),
      }),
    ),
  }),
) {}
