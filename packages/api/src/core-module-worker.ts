import 'reflect-metadata'

import {
  connectAndPerformWork,
  objectAddedEventHandler,
} from '@stellariscloud/core-worker'
import type { ModuleLogEntry } from '@stellariscloud/types'
import * as r from 'runtypes'
import workerThreads from 'worker_threads'

import { CORE_MODULE_ID } from './domains/module/constants/core-module.config'

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
  externalId: r.String,
  moduleToken: r.String,
  socketBaseUrl: r.String,
})

if (
  !workerThreads.isMainThread &&
  WorkerDataPayloadRuntype.validate(workerThreads.workerData).success
) {
  sendLogEntry({
    message: 'Core module worker thread start...',
    data: {
      externalId: workerThreads.workerData.externalId,
    },
  })

  const { wait } = connectAndPerformWork(
    workerThreads.workerData.socketBaseUrl as string,
    CORE_MODULE_ID,
    workerThreads.workerData.moduleToken as string,
    workerThreads.workerData.externalId as string,
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
      console.log('Error:', e)
      const logEntry: ModuleLogEntry = {
        data: {},
        name: 'module_worker_error',
        level: 'error',
        message: e.message,
      }
      workerThreads.parentPort?.postMessage(JSON.stringify(logEntry, null, 2))
    })
} else if (!workerThreads.isMainThread) {
  sendLogEntry({ message: `Didn't run.` })
  console.log("Is not main thread but didn't run because { workerData }:", {
    workerData: workerThreads.workerData,
  })
}
