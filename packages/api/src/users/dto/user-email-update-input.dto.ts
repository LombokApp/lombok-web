import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const userEmailUpdateInputSchema = z.object({
  value: z.email('This is not a valid email.'),
})

export class UserEmailUpdateInputDTO extends createZodDto(
  userEmailUpdateInputSchema,
) {}
