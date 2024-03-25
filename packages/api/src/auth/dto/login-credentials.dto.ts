import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const loginCredentialsSchema = z.object({
  login: z.string(),
  password: z.string(),
})

export class LoginCredentialsDTO extends createZodDto(loginCredentialsSchema) {}
