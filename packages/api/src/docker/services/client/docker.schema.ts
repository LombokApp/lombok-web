import type { JsonSerializableObject } from '@lombokapp/types'
import {
  containerProfileConfigSchema,
  jsonSerializableObjectSchema,
  storageAccessPolicySchema,
} from '@lombokapp/types'
import z from 'zod'

export interface ContainerCreateOptions {
  image: string
  labels: Record<string, string>
}

export interface ContainerExecuteOptions {
  env?: Record<string, string>
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
    folder_id: string
    prefix?: string
  }
  platform_url?: string
}

export const dockerExecuteJobOptionsSchema = z.object({
  containerRef: z.string().optional(),
  asyncTaskId: z.string().optional(),
  storageAccessPolicy: storageAccessPolicySchema.optional(),
  profileSpec: containerProfileConfigSchema,
  profileKey: z.string(),
  jobIdentifier: z.string(),
  jobData: jsonSerializableObjectSchema,
  appIdentifier: z.string().optional(),
  userId: z.uuid().optional(),
})

export type DockerExecuteJobOptions = z.infer<
  typeof dockerExecuteJobOptionsSchema
>
