import z from 'zod'

export const dockerManagerRunConfigSchema = z
  .object({
    image: z.string(),
    command: z.array(z.string()).optional(),
    environmentVariables: z.record(z.string(), z.string()).optional(),
  })
  .strict()

export const dockerExecutionOptionsSchema = z
  .object({
    image: z.string(),
    command: z.array(z.string()).optional(),
    environmentVariables: z.record(z.string(), z.string()).optional(),
  })
  .strict()
