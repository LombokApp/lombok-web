import type { JsonSerializableObject } from '@lombokapp/types'
import {
  containerProfileConfigSchema,
  jsonSerializableObjectDTOSchema,
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
  jobData: jsonSerializableValueSchema,
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
  jobData?: JsonSerializableObject
  outputLocation?: {
    folderId: string
    prefix?: string
  }
  platformURL: string
  volumes?: Record<string, string>
  gpus?: { driver: string; deviceIds: string[] } | undefined
}

export const dockerExecuteJobOptionsSchema = z.object({
  asyncTaskId: z.string().optional(),
  storageAccessPolicy: storageAccessPolicySchema.optional(),
  profileSpec: containerProfileConfigSchema,
  profileHostConfigKey: z.string(),
  outputLocation: z
    .object({ folderId: z.string(), prefix: z.string().optional() })
    .optional(),
  jobIdentifier: z.string(),
  jobData: jsonSerializableObjectDTOSchema,
})

export type DockerExecuteJobOptions = z.infer<
  typeof dockerExecuteJobOptionsSchema
>
