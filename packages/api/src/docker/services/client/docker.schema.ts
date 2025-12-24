import type { JsonSerializableObject } from '@lombokapp/types'
import {
  containerProfileConfigSchema,
  jsonSerializableObjectDTOSchema,
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

export const containerExecuteOptionsSchema = z
  .object({
    command: z.array(z.string()),
    captureOutput: z.boolean(),
  })
  .strict()

export interface ContainerCreateAndExecuteOptions {
  image: string
  command: string[]
  labels: Record<string, string>
}

export interface ContainerExecuteOptions {
  command: string[]
}

export interface JobExecuteOptions {
  job_id: string
  job_token?: string
  job_class: string
  worker_command: string[]
  interface:
    | {
        kind: 'persistent_http'
        port: number
      }
    | {
        kind: 'exec_per_job'
      }
  job_input?: JsonSerializableObject
  output_location?: {
    folderId: string
    prefix?: string
  }
  platform_url?: string
}

export const dockerExecuteJobOptionsSchema = z.object({
  asyncTaskId: z.string().optional(),
  storageAccessPolicy: storageAccessPolicySchema.optional(),
  profileSpec: containerProfileConfigSchema,
  profileKey: z.string(),
  outputLocation: z
    .object({ folderId: z.string(), prefix: z.string().optional() })
    .optional(),
  jobIdentifier: z.string(),
  jobData: jsonSerializableObjectDTOSchema,
})

export type DockerExecuteJobOptions = z.infer<
  typeof dockerExecuteJobOptionsSchema
>
