import { accessKeySchema } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const accessKeyGetResponseSchema = z.object({
  accessKey: accessKeySchema,
})

export class AccessKeyGetResponse extends createZodDto(
  accessKeyGetResponseSchema,
) {}
