import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export class FolderCreateSignedUrlsResponse extends createZodDto(
  z.array(z.string()),
) {}
