import {
  analyzeObjectTaskHandler,
  connectAndPerformWork,
  runWorkerScriptHandler,
} from '@stellariscloud/core-worker'
import type { AppLogEntry } from '@stellariscloud/types'
import workerThreads from 'worker_threads'
import * as z from 'zod'

const sendLogEntry = (logEntryProperties: Partial<AppLogEntry>) => {
  const logEntry: AppLogEntry = {
    data: logEntryProperties.data ?? {},
    name: logEntryProperties.name ?? 'info',
    level: logEntryProperties.level ?? 'info',
    message: logEntryProperties.message ?? '',
  }
  workerThreads.parentPort?.postMessage(logEntry)
}

const WorkerDataPayloadRunType = z.object({
  appWorkerId: z.string(),
  appToken: z.string(),
  socketBaseUrl: z.string(),
})

type WorkerDataPayload = z.infer<typeof WorkerDataPayloadRunType>

let initialized = false

workerThreads.parentPort?.once('message', (workerData: WorkerDataPayload) => {
  if (
    !workerThreads.isMainThread &&
    !initialized &&
    WorkerDataPayloadRunType.safeParse(workerData).success
  ) {
    initialized = true
    sendLogEntry({
      message: 'Core app worker thread started...',
      name: 'CoreAppWorkerStartup',
      data: {
        appWorkerId: workerData.appWorkerId,
      },
    })

    const { wait } = connectAndPerformWork(
      workerData.socketBaseUrl,
      workerData.appWorkerId,
      workerData.appToken,
      {
        ['ANALYZE_OBJECT']: analyzeObjectTaskHandler,
        ['RUN_WORKER_SCRIPT']: runWorkerScriptHandler,
      },
      sendLogEntry,
    )

    void wait
      .then(() => {
        // eslint-disable-next-line no-console
        console.log('Done work.')
      })
      .catch((e: unknown) => {
        // eslint-disable-next-line no-console
        console.log('Reporting Error:', e)
        if (
          e &&
          typeof e === 'object' &&
          'name' in e &&
          'message' in e &&
          'stacktrace' in e
        ) {
          sendLogEntry({
            message: 'Core app worker thread error.',
            level: 'error',
            name: 'CoreAppWorkerError',
            data: {
              name: e.name,
              message: e.message,
              stacktrace: e.stacktrace,
              appWorkerId: workerData.appWorkerId,
            },
          })
        }
        throw e
      })
      .finally(() => {
        // eslint-disable-next-line no-console
        console.log('Shutting down.')
      })
  } else if (!workerThreads.isMainThread) {
    sendLogEntry({ message: `Didn't run.` })
    // eslint-disable-next-line no-console
    console.log("Is not main thread but didn't run because { workerData }:", {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      workerData: workerThreads.workerData,
    })
  }
})
