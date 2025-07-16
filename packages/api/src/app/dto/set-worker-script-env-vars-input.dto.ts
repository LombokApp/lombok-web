import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const setWorkerScriptEnvVarsInputSchema = z.object({
  envVars: z.record(z.string(), z.string()),
})

export class SetWorkerScriptEnvVarsInputDTO extends createZodDto(
  setWorkerScriptEnvVarsInputSchema,
) {}
