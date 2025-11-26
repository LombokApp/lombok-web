import z from 'zod'

import { dockerManagerRunConfigSchema } from './docker-manager-run-config.schema'

export const runDockerImageTaskInputDataSchema = z
  .object({
    runConfig: dockerManagerRunConfigSchema,
  })
  .strict()
