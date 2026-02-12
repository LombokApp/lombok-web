import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export class FolderCreateSignedUrlsResponse extends createZodDto(
  z.object({ urls: z.array(z.string()) }),
) {}
