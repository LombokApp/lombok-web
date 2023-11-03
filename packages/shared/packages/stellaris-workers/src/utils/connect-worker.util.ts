import type { ConfigurationParameters } from '@stellariscloud/api-client'
import { Configuration, WorkerApi } from '@stellariscloud/api-client'
import type { WorkerTask } from '@stellariscloud/workers'
import type { AxiosInstance } from 'axios'
import * as r from 'runtypes'
import { io } from 'socket.io-client'

export const bindApiConfig =
  <T>(
    defaults: ConfigurationParameters,
    Constructor: new (
      configuration: Configuration,
      _: undefined,
      axios?: AxiosInstance,
    ) => T,
    axiosInstance?: AxiosInstance,
  ) =>
  (_config?: ConfigurationParameters) =>
    new Constructor(
      new Configuration({ ...defaults, ..._config }),
      undefined,
      axiosInstance,
    )

const checkAvailabilityRunType = r.Record({
  messageType: r.Literal('CHECK_AVAILABILITY'),
  task: r.Record({
    id: r.String,
    name: r.String,
    data: r.Unknown,
  }),
})

export const connectAndPerformWork = async (
  apiBaseUrl: string,
  socketBaseUrl: string,
  workerToken: string,
  externalId: string,
  workHandlers: {
    [capability: string]: (task: WorkerTask<any, any>) => Promise<void>
  },
  isAvailableForWork: (WorkerTask: {
    id: string
    name: string
    data: unknown
  }) => Promise<boolean>,
) => {
  const workerApi = bindApiConfig(
    {
      basePath: apiBaseUrl,
      baseOptions: {
        headers: { Authorization: `Bearer ${workerToken}` },
      },
    },
    WorkerApi,
  )()

  const {
    data: { token },
  } = await workerApi.createSocketAuthentication()

  const socket = io(socketBaseUrl, {
    query: { token, externalId, capabilities: Object.keys(workHandlers) },
    reconnection: false,
  })
  const shutdown = () => {
    socket.close()
  }

  const wait = new Promise<void>((resolve, reject) => {
    socket.on('connect', () => {
      console.log('Worker connected.', externalId)
    })

    socket.on('disconnect', (reason) => {
      console.log('Worker disconnected. Reason:', reason)
      resolve()
    })

    socket.on('WORK_REQUEST', (message, callback) => {
      console.log('WORK_REQUEST message received:', message)
      if (checkAvailabilityRunType.guard(message)) {
        void isAvailableForWork(message.task).then((willComplete) => {
          callback({
            willComplete,
          })
          if (willComplete) {
            void workHandlers[message.task.name](message.task)
          }
        })
      } else {
        console.log('Unrecognised message:', message)
      }
    })

    socket.on('error', (error) => {
      console.log('Socker error:', error, externalId)
      socket.close()
      reject(error)
    })
  })

  return {
    shutdown,
    wait: () => wait,
  }
}
