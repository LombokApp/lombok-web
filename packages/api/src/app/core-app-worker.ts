import {
  connectAndPerformWork,
  analyzeObjectTaskHandler,
} from '@stellariscloud/core-worker'
import type { AppLogEntry } from '@stellariscloud/types'
import * as r from 'runtypes'
import workerThreads from 'worker_threads'

const sendLogEntry = (logEntryProperties: Partial<AppLogEntry>) => {
  const logEntry: AppLogEntry = {
    data: logEntryProperties.data ?? {},
    name: logEntryProperties.name ?? 'info',
    level: logEntryProperties.level ?? 'info',
    message: logEntryProperties.message ?? '',
  }
  workerThreads.parentPort?.postMessage(logEntry)
}

const WorkerDataPayloadRunType = r.Record({
  appWorkerId: r.String,
  appToken: r.String,
  socketBaseUrl: r.String,
})

type WorkerDataPayload = r.Static<typeof WorkerDataPayloadRunType>

let initialized = false

workerThreads.parentPort?.once('message', (workerData: WorkerDataPayload) => {
  if (
    !workerThreads.isMainThread &&
    !initialized &&
    WorkerDataPayloadRunType.validate(workerData).success
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
        ['CORE:ANALYZE_OBJECT']: analyzeObjectTaskHandler,
      },
      sendLogEntry,
    )

    void wait
      .then(() => {
        console.log('Done work.')
      })
      .catch((e) => {
        console.log('Reporting Error:', e)
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
        throw e
      })
      .finally(() => {
        console.log('Shutting down.')
      })
  } else if (!workerThreads.isMainThread) {
    sendLogEntry({ message: `Didn't run.` })
    console.log("Is not main thread but didn't run because { workerData }:", {
      workerData: workerThreads.workerData,
    })
  }
})
