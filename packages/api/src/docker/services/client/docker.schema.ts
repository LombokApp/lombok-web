import {
  containerProfileConfigSchema,
  jsonSerializableValueSchema,
} from '@lombokapp/types'
import z from 'zod'

export const dockerExecutionOptionsSchema = z
  .object({
    image: z.string(),
    command: z.array(z.string()).optional(),
    environmentVariables: z.record(z.string(), z.string()).optional(),
  })
  .strict()

export const dockerExecuteJobOptionsSchema = z.object({
  waitForCompletion: z.boolean(),
  profileSpec: containerProfileConfigSchema,
  hostConfigId: z.string(),
  jobId: z.string(),
  jobToken: z.string().optional(),
  jobName: z.string(),
  jobCommand: z.array(z.string()),
  jobInterface: z.object({
    kind: z.enum(['exec_per_job', 'persistent_http']),
    listener: z
      .object({
        type: z.literal('tcp'),
        port: z.number(),
      })
      .optional(),
  }),
  jobInputData: jsonSerializableValueSchema,
  volumes: z.record(z.string(), z.string()).optional(),
  gpus: z
    .object({ driver: z.string(), deviceIds: z.array(z.string()) })
    .optional(),
})

export type DockerExecuteJobOptions = z.infer<
  typeof dockerExecuteJobOptionsSchema
>
