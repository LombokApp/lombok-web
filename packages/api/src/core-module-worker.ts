import 'reflect-metadata'

import {
  connectAndPerformWork,
  objectAddedEventHandler,
} from '@stellariscloud/core-worker'
import type { ModuleLogEntry } from '@stellariscloud/types'
import * as r from 'runtypes'
import workerThreads from 'worker_threads'

const sendLogEntry = (logEntryProperties: Partial<ModuleLogEntry>) => {
  const logEntry: ModuleLogEntry = {
    data: logEntryProperties.data ?? {},
    name: logEntryProperties.name ?? 'info',
    level: logEntryProperties.level ?? 'info',
    message: logEntryProperties.message ?? '',
  }
  workerThreads.parentPort?.postMessage(logEntry)
}

const WorkerDataPayloadRuntype = r.Record({
  moduleWorkerId: r.String,
  moduleToken: r.String,
  socketBaseUrl: r.String,
})

if (
  !workerThreads.isMainThread &&
  WorkerDataPayloadRuntype.validate(workerThreads.workerData).success
) {
  sendLogEntry({
    message: 'Core module worker thread start...',
    name: 'CoreModuleWorkerStartup',
    data: {
      moduleWorkerId: workerThreads.workerData.moduleWorkerId,
    },
  })

  const { wait } = connectAndPerformWork(
    workerThreads.workerData.socketBaseUrl as string,
    workerThreads.workerData.moduleWorkerId as string,
    workerThreads.workerData.moduleToken as string,
    {
      ['CORE:OBJECT_ADDED']: objectAddedEventHandler,
    },
    sendLogEntry,
  )

  void wait
    .then(() => {
      console.log('Finished.')
    })
    .catch((e) => {
      sendLogEntry({
        message: 'Core module worker thread error.',
        level: 'error',
        name: 'CoreModuleWorkerError',
        data: {
          name: e.name,
          message: e.message,
          stacktrace: e.stacktrace,
          moduleWorkerId: workerThreads.workerData.moduleWorkerId,
        },
      })
      throw e
    })
    .finally(() => {
      console.log('Finally Finished.')
    })
} else if (!workerThreads.isMainThread) {
  sendLogEntry({ message: `Didn't run.` })
  console.log("Is not main thread but didn't run because { workerData }:", {
    workerData: workerThreads.workerData,
  })
}
