import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { accessKeySchema } from '../access-key.dto'

export const accessKeyGetResponseSchema = z.object({
  accessKey: accessKeySchema,
})

export class AccessKeyGetResponse extends createZodDto(
  accessKeyGetResponseSchema,
) {}
