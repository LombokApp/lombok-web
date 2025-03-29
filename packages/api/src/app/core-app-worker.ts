import {
  analyzeObjectTaskHandler,
  connectAndPerformWork,
  runWorkerScriptHandler,
} from '@stellariscloud/core-worker'
import type { AppLogEntry } from '@stellariscloud/types'
import workerThreads from 'worker_threads'
import * as z from 'zod'

const log = (logEntryProperties: Partial<AppLogEntry>) => {
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
    log({
      message: 'Core app worker thread started...',
      name: 'CoreAppWorkerStartup',
      data: {
        workerData,
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
      log,
    )

    void wait
      .then(() => {
        // eslint-disable-next-line no-console
        log({ message: 'Done work.', level: 'info' })
      })
      .catch((e: unknown) => {
        // eslint-disable-next-line no-console
        log({ level: 'error', message: e instanceof Error ? e.message : '' })
        if (
          e &&
          typeof e === 'object' &&
          'name' in e &&
          'message' in e &&
          'stacktrace' in e
        ) {
          log({
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
      .finally(() => log({ level: 'info', message: 'Shutting down.' }))
  } else if (!workerThreads.isMainThread) {
    log({ message: `Didn't run.` })
    // eslint-disable-next-line no-console
    log({
      level: 'error',
      message: "Is not main thread but didn't run because { workerData }:",
      data: { workerData: workerThreads.workerData },
    })
  }
})
