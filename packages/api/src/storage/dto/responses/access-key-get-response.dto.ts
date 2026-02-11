import { accessKeyPublicSchema } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const accessKeyGetResponseSchema = z.object({
  accessKey: accessKeyPublicSchema,
})

export class AccessKeyGetResponse extends createZodDto(
  accessKeyGetResponseSchema,
) {}
