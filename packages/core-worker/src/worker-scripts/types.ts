import type { AppTask, SerializeableRequest } from '@lombokapp/app-worker-sdk'
import { z } from 'zod'

export interface WorkerModuleStartContext {
  resultFilepath: string
  outputLogFilepath: string
  errorLogFilepath: string
  workerIdentifier: string
  workerToken: string
  serverBaseUrl: string
  scriptPath: string
  executionId: string
  executionType: 'request' | 'task'
  request?: SerializeableRequest
  task?: AppTask
}

export const coreWorkerProcessDataPayloadSchema = z.object({
  appWorkerId: z.string(),
  appToken: z.string(),
  socketBaseUrl: z.string(),
  jwtSecret: z.string(),
  platformHost: z.string(),
  executionOptions: z
    .object({
      printWorkerOutput: z.boolean().optional(),
      removeWorkerDirectory: z.boolean().optional(),
    })
    .optional(),
})

export type CoreWorkerProcessDataPayload = z.infer<
  typeof coreWorkerProcessDataPayloadSchema
>
