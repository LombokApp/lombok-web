import type { SerializeableRequest } from '@lombokapp/app-worker-sdk'
import type { taskSchema } from '@lombokapp/types'
import { z } from 'zod'

export interface WorkerModuleStartContext {
  outputLogFilepath: string
  errorLogFilepath: string
  workerIdentifier: string
  workerToken: string
  serverBaseUrl: string
  scriptPath: string
  executionId: string
  startTimestamp: number
  // Bidirectional pipes for long-running worker communication
  requestPipePath: string
  responsePipePath: string
}

export const coreWorkerProcessDataPayloadSchema = z.object({
  appWorkerId: z.string(),
  appToken: z.string(),
  socketBaseUrl: z.string(),
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

// Pipe communication protocol for long-running workers
export interface WorkerPipeRequest {
  id: string
  type: 'request' | 'task'
  timestamp: number
  data: SerializeableRequest | z.infer<typeof taskSchema>
  // For authentication context
  authToken?: string
  appIdentifier?: string
  // Per-request log file overrides inside the jail
  outputLogFilepath?: string
  errorLogFilepath?: string
}

export interface SerializableResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body?: string // Only for non-streaming responses
  url: string
  isStreaming?: boolean // Flag to indicate this is a streaming response
}

export interface WorkerPipeResponse {
  id: string
  timestamp: number
  success: boolean
  response?:
    | Response
    | {
        status: number
        statusText: string
        headers: Record<string, string>
        url: string
        isStreaming: boolean
      }
    | {
        status: number
        statusText: string
        headers: Record<string, string>
        body: string
        url: string
      }
  error?: {
    name: string
    message: string
    stack?: string
  }
}

export interface StreamChunk {
  requestId: string
  chunk: string // base64 encoded chunk data
  chunkIndex: number
}

export interface StreamEnd {
  requestId: string
  totalChunks: number
}

export interface WorkerPipeMessage {
  type:
    | 'request'
    | 'response'
    | 'stream_chunk'
    | 'stream_end'
    | 'stdout_chunk'
    | 'shutdown'
  payload:
    | WorkerPipeRequest
    | WorkerPipeResponse
    | StreamChunk
    | StreamEnd
    | {
        requestId: string
        text: string
      }
    | null
}
