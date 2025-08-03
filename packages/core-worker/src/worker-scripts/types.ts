import { AppTask } from '@stellariscloud/app-worker-sdk'

export type WorkerModuleStartContext = {
  resultFilepath: string
  outputLogFilepath: string
  errorLogFilepath: string
  workerIdentifier: string
  workerToken: string
  serverBaseUrl: string
  scriptPath: string
  executionId: string
  executionType: 'request' | 'task'
  request?: {
    url: string
    method: string
    headers: Record<string, string>
    body: any
  }
  task?: AppTask
}
