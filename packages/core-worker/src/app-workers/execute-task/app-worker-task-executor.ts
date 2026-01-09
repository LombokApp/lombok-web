import { AppAPIError } from '@lombokapp/app-worker-sdk'
import type { TaskDTO } from '@lombokapp/types'
import type {
  CoreWorkerMessagePayloadTypes,
  ServerlessWorkerExecConfig,
} from '@lombokapp/worker-utils'
import { AsyncWorkError, uniqueExecutionKey } from '@lombokapp/worker-utils'

import { runWorker } from '../../worker-scripts/run-worker'

interface RunWorkerScriptTaskInput {
  task: TaskDTO
  appIdentifier: string
  workerIdentifier: string
  serverlessWorkerDetails: ServerlessWorkerExecConfig
  onStdoutChunk?: (text: string) => void
}

export const buildRunWorkerScriptTaskHandler =
  (
    workerExecutionOptions: CoreWorkerMessagePayloadTypes['init']['request']['executionOptions'],
    appWorkerHashMapping: Record<string, string>,
    serverBaseUrl: string,
  ) =>
  async ({
    task,
    appIdentifier,
    workerIdentifier,
    serverlessWorkerDetails,
    onStdoutChunk,
  }: RunWorkerScriptTaskInput) => {
    const workerHash =
      appWorkerHashMapping[appIdentifier] ?? serverlessWorkerDetails.hash

    if (!workerHash) {
      throw new AppAPIError('WORKER_HASH_NOT_FOUND', 'Worker hash not found', {
        appIdentifier,
      })
    }

    if (!(appIdentifier in appWorkerHashMapping)) {
      appWorkerHashMapping[appIdentifier] = workerHash
    }

    const workerExecutionId = `${workerIdentifier.toLowerCase()}__task__${uniqueExecutionKey()}`

    try {
      await runWorker({
        requestOrTask: task,
        serverBaseUrl,
        appIdentifier,
        workerHash,
        workerIdentifier,
        workerExecutionId,
        serverlessWorkerDetails,
        options: workerExecutionOptions,
        onStdoutChunk,
      })
    } catch (error) {
      if (error instanceof AsyncWorkError) {
        throw error
      }
      throw error
    }
  }
