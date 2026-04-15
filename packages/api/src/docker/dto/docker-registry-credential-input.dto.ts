import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const dockerRegistryCredentialInputSchema = z.object({
  registry: z.string().min(1).max(256),
  serverAddress: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
})

export class DockerRegistryCredentialInputDTO extends createZodDto(
  dockerRegistryCredentialInputSchema,
) {}

export const dockerRegistryCredentialUpdateSchema =
  dockerRegistryCredentialInputSchema.partial()

export class DockerRegistryCredentialUpdateDTO extends createZodDto(
  dockerRegistryCredentialUpdateSchema,
) {}
