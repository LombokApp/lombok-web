import type { JsonSerializableObject } from '@lombokapp/types'
import {
  containerProfileConfigSchema,
  jsonSerializableObjectSchema,
  jsonSerializableValueSchema,
  storageAccessPolicySchema,
} from '@lombokapp/types'
import z from 'zod'

export const dockerExecutionOptionsSchema = z
  .object({
    image: z.string(),
    command: z.array(z.string()).optional(),
    environmentVariables: z.record(z.string(), z.string()).optional(),
  })
  .strict()

export const containerWorkerExecuteOptionsSchema = z.object({
  waitForCompletion: z.boolean(),
  jobId: z.string(),
  jobToken: z.string().optional(),
  jobIdentifier: z.string(),
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

export interface ContainerWorkerExecuteOptions<T extends boolean> {
  waitForCompletion: T
  jobId: string
  jobToken?: string
  jobIdentifier: string
  jobCommand: string[]
  jobInterface:
    | {
        kind: 'persistent_http'
        listener: {
          type: 'tcp'
          port: number
        }
      }
    | {
        kind: 'exec_per_job'
      }
  jobInputData?: JsonSerializableObject
  volumes?: Record<string, string>
  gpus?: { driver: string; deviceIds: string[] } | undefined
}

export const dockerExecuteJobOptionsSchema = z.object({
  asyncTaskId: z.string().optional(),
  storageAccessPolicy: storageAccessPolicySchema.optional(),
  profileSpec: containerProfileConfigSchema,
  profileHostConfigKey: z.string(),
  jobIdentifier: z.string(),
  jobInputData: jsonSerializableObjectSchema,
})

export type DockerExecuteJobOptions = z.infer<
  typeof dockerExecuteJobOptionsSchema
>
