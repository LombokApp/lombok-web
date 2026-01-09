import { AppAPIError } from '@lombokapp/app-worker-sdk'
import type { TaskDTO } from '@lombokapp/types'
import type {
  CoreWorkerMessagePayloadTypes,
  ServerlessWorkerExecConfig,
} from '@lombokapp/worker-utils'
import {
  AsyncWorkError,
  uniqueExecutionKey,
} from '@lombokapp/worker-utils'

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
    appInstallIdMapping: Record<string, string>,
    serverBaseUrl: string,
  ) =>
  async ({
    task,
    appIdentifier,
    workerIdentifier,
    serverlessWorkerDetails,
    onStdoutChunk,
  }: RunWorkerScriptTaskInput) => {
    const appInstallId =
      appInstallIdMapping[appIdentifier] ?? serverlessWorkerDetails.installId

    if (!appInstallId) {
      throw new AppAPIError(
        'APP_INSTALL_ID_NOT_FOUND',
        'App install ID not found',
        {
          appIdentifier,
        },
      )
    }

    if (!(appIdentifier in appInstallIdMapping)) {
      appInstallIdMapping[appIdentifier] = appInstallId
    }

    const workerExecutionId = `${workerIdentifier.toLowerCase()}__task__${uniqueExecutionKey()}`

    try {
      await runWorker({
        requestOrTask: task,
        serverBaseUrl,
        appIdentifier,
        appInstallId,
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
