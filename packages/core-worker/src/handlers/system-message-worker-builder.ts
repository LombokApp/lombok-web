import type {
  CoreWorkerMessagePayloadTypes,
  ServerlessWorkerExecConfig,
  SystemRequestResult,
} from '@lombokapp/core-worker-utils'
import { uniqueExecutionKey } from '@lombokapp/core-worker-utils'
import { LogEntryLevel } from '@lombokapp/types'
import { runWorker } from 'src/worker-scripts/run-worker'

export type SystemRequestPayload =
  CoreWorkerMessagePayloadTypes['execute_system_request']['request']

export const buildSystemRequestWorker = ({
  log,
  appInstallIdMapping,
  serverBaseUrl,
  executionOptions,
  getWorkerExecutionDetails,
}: {
  log: (log: {
    message: string
    level: LogEntryLevel
    data?: Record<string, unknown>
  }) => void
  appInstallIdMapping: Record<string, string>
  serverBaseUrl: string
  executionOptions: CoreWorkerMessagePayloadTypes['init']['request']['executionOptions']
  getWorkerExecutionDetails: (params: {
    appIdentifier: string
    workerIdentifier: string
  }) => Promise<ServerlessWorkerExecConfig>
}) => {
  return async ({
    appIdentifier,
    request,
  }: SystemRequestPayload): Promise<SystemRequestResult | null> => {
    const url = new URL(request.url)
    const pathname = url.pathname
    const workerIdentifierMatch = pathname.match(/^\/worker-api\/([^/]+)/)

    if (!workerIdentifierMatch) {
      throw new Error('Invalid worker API path')
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const workerIdentifier = workerIdentifierMatch[1]!

    const serverlessWorkerDetails = await getWorkerExecutionDetails({
      appIdentifier,
      workerIdentifier,
    })

    const appInstallId =
      appInstallIdMapping[appIdentifier] ?? serverlessWorkerDetails.installId

    if (!appInstallId) {
      log({
        message: `App install ID not found for app: ${appIdentifier}`,
        level: LogEntryLevel.ERROR,
        data: {
          appIdentifier,
          requestUrl: request.url,
        },
      })
      throw new Error('Unexpected error')
    }

    const headers = new Headers(request.headers)
    const body = request.body
      ? typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body)
      : undefined

    const systemRequestMessageResponse = await runWorker({
      requestOrTask: new Request(request.url, {
        method: request.method,
        headers,
        body,
      }),
      serverBaseUrl,
      appIdentifier,
      appInstallId,
      workerIdentifier,
      workerExecutionId: `${workerIdentifier.toLowerCase()}__request__${uniqueExecutionKey()}`,
      options: executionOptions,
      serverlessWorkerDetails,
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
