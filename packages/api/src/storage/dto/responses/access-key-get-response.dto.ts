import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { accessKeyPublicSchema } from '../access-key-public.dto'

export const accessKeyGetResponseSchema = z.object({
  accessKey: accessKeyPublicSchema,
})

export class AccessKeyGetResponse extends createZodDto(
  accessKeyGetResponseSchema,
) {}
