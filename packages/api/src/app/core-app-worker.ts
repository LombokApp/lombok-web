import {
  analyzeObjectTaskHandler,
  connectAndPerformWork,
  runWorkerScriptHandler,
} from '@stellariscloud/core-worker'
import * as z from 'zod'

const WorkerDataPayloadRunType = z.object({
  appWorkerId: z.string(),
  appToken: z.string(),
  socketBaseUrl: z.string(),
})

type WorkerDataPayload = z.infer<typeof WorkerDataPayloadRunType>

let initialized = false

process.stdin.once('data', (data) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const workerData: WorkerDataPayload = JSON.parse(data.toString())
  if (!initialized && WorkerDataPayloadRunType.safeParse(workerData).success) {
    initialized = true
    const { wait, log, socket } = connectAndPerformWork(
      workerData.socketBaseUrl,
      workerData.appWorkerId,
      workerData.appToken,
      {
        ['ANALYZE_OBJECT']: analyzeObjectTaskHandler,
        ['RUN_WORKER_SCRIPT']: runWorkerScriptHandler,
      },
    )

    log({
      message: 'Core app worker thread started...',
      name: 'CoreAppWorkerStartup',
      data: {
        workerData,
      },
    })

    void wait
      .then(() => {
        ;(socket.disconnected ? console.log : log)({
          message: 'Done work.',
          level: 'info',
        })
      })
      .catch((e: unknown) => {
        ;(socket.disconnected ? console.log : log)({
          level: 'error',
          message: e instanceof Error ? e.message : '',
        })
        if (
          e &&
          typeof e === 'object' &&
          'name' in e &&
          'message' in e &&
          'stacktrace' in e
        ) {
          ;(socket.disconnected ? console.log : log)({
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
      .finally(() => console.log({ level: 'info', message: 'Shutting down.' }))
  }
})
