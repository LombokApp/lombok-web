import { LogEntryLevel } from '@lombokapp/types'
import type {
  CoreWorkerMessagePayloadTypes,
  ServerlessWorkerExecConfig,
  SystemRequestResult,
} from '@lombokapp/worker-utils'
import { uniqueExecutionKey } from '@lombokapp/worker-utils'
import { runWorker } from 'src/worker-scripts/run-worker'

export type SystemRequestPayload =
  CoreWorkerMessagePayloadTypes['execute_system_request']['request']

export const buildSystemRequestWorker = ({
  log,
  appWorkerHashMapping,
  serverBaseUrl,
  executionOptions,
  getWorkerExecConfig,
}: {
  log: (log: {
    message: string
    level: LogEntryLevel
    data?: Record<string, unknown>
  }) => void
  appWorkerHashMapping: Record<string, string>
  serverBaseUrl: string
  executionOptions: CoreWorkerMessagePayloadTypes['init']['request']['executionOptions']
  getWorkerExecConfig: (params: {
    appIdentifier: string
    workerIdentifier: string
  }) => Promise<ServerlessWorkerExecConfig>
}) => {
  return async ({
    workerIdentifier,
    appIdentifier,
    request,
  }: SystemRequestPayload): Promise<SystemRequestResult | null> => {
    const serverlessWorkerDetails = await getWorkerExecConfig({
      appIdentifier,
      workerIdentifier,
    })

    const workerHash =
      appWorkerHashMapping[appIdentifier] ?? serverlessWorkerDetails.hash

    if (!workerHash) {
      log({
        message: `Worker hash not found for app: ${appIdentifier}`,
        level: LogEntryLevel.ERROR,
        data: {
          appIdentifier,
          requestUrl: request.url,
        },
      })
      throw new Error('Unexpected error')
    }

    const headers = new Headers(request.headers)
    headers.set('Content-Type', 'application/json')
    const body = request.body
      ? typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body)
      : undefined
    const systemRequestMessageResponse = await runWorker({
      requestOrTask: new Request(`http://__SYSTEM__${request.url}`, {
        method: request.method,
        headers,
        body,
      }),
      serverBaseUrl,
      appIdentifier,
      workerHash,
      workerIdentifier,
      workerExecutionId: `${workerIdentifier.toLowerCase()}__request__${uniqueExecutionKey()}`,
      options: executionOptions,
      serverlessWorkerDetails,
      isSystemRequest: true,
      onStdoutChunk:
        executionOptions?.printWorkerOutput !== false
          ? (text) => {
              // eslint-disable-next-line no-console
              console.log(
                `[${appIdentifier}/${workerIdentifier}] ${text.trimEnd()}`,
              )
            }
          : undefined,
    })

    if (!systemRequestMessageResponse) {
      return null
    }

    return {
      status: systemRequestMessageResponse.status,
      statusText: systemRequestMessageResponse.statusText,
      headers: Object.fromEntries(
        systemRequestMessageResponse.headers.entries(),
      ),
      body: await systemRequestMessageResponse.text(),
    }
  }
}
