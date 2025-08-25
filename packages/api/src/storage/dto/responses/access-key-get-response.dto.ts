import { createZodDto } from '@anatine/zod-nestjs'
import { accessKeyPublicSchema } from '@lombokapp/types'
import { z } from 'zod'

export const accessKeyGetResponseSchema = z.object({
  accessKey: accessKeyPublicSchema,
})

export class AccessKeyGetResponse extends createZodDto(
  accessKeyGetResponseSchema,
) {}
