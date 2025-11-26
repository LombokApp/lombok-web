import type { z } from 'zod'

import type {
  dockerExecutionOptionsSchema,
  dockerManagerRunConfigSchema,
} from './schemas/docker-manager-run-config.schema'

export interface DockerAdapter {
  run: ({
    image,
    command,
    environmentVariables,
  }: DockerRunConfig) => Promise<void>
}

export type DockerRunConfig = z.infer<typeof dockerManagerRunConfigSchema>
export type DockerExecutionOptions = z.infer<
  typeof dockerExecutionOptionsSchema
>
