import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const userEmailUpdateInputSchema = z.object({
  value: z
    .string()
    .min(1, { message: 'This field has to be filled.' })
    .email('This is not a valid email.'),
})

export class UserEmailUpdateInputDTO extends createZodDto(
  userEmailUpdateInputSchema,
) {}
