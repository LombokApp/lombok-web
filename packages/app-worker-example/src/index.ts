import { connectAndPerformWork } from '@stellariscloud/core-worker'
import { AppLogEntry } from '@stellariscloud/types'
import { dummyTaskHandler } from './dummy-task-handler'

if (!process.env.SOCKET_BASE_URL) {
  throw new Error('Missing process.env.SOCKET_BASE_URL')
}
if (!process.env.APP_WORKER_ID) {
  throw new Error('Missing process.env.APP_WORKER_ID')
}
if (!process.env.APP_TOKEN) {
  throw new Error('Missing process.env.APP_TOKEN')
}

const sendLogEntry = (logEntryProperties: Partial<AppLogEntry>) => {
  const logEntry: AppLogEntry = {
    data: logEntryProperties.data ?? {},
    name: logEntryProperties.name ?? 'info',
    level: logEntryProperties.level ?? 'info',
    message: logEntryProperties.message ?? '',
  }
  console.log({ logEntry })
}

const { wait } = connectAndPerformWork(
  process.env.SOCKET_BASE_URL,
  process.env.APP_WORKER_ID,
  process.env.APP_TOKEN,
  {
    ['DUMMY_TASK']: dummyTaskHandler,
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
        appWorkerId: process.env.APP_WORKER_ID,
      },
    })
    throw e
  })
  .finally(() => {
    console.log('Shutting down.')
  })
