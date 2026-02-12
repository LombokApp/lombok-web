import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const setWorkerEnvironmentVariablesInputSchema = z.object({
  environmentVariables: z.record(z.string(), z.string()),
})

export class SetWorkerEnvironmentVariablesInputDTO extends createZodDto(
  setWorkerEnvironmentVariablesInputSchema,
) {}
