import type {
  AppTask,
  SerializeableRequest,
} from '@stellariscloud/app-worker-sdk'

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
