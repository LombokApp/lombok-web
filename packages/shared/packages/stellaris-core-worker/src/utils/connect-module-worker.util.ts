import type {
  ContentAttributesType,
  ContentMetadataType,
  ModuleLogEntry,
} from '@stellariscloud/types'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'

const SOCKET_RESPONSE_TIMEOUT = 2000

export const buildModuleClient = (
  socket: Socket,
): CoreServerMessageInterface => {
  return {
    saveLogEntry(entry) {
      return socket.timeout(SOCKET_RESPONSE_TIMEOUT).emitWithAck('MODULE_API', {
        name: 'SAVE_LOG_ENTRY',
        data: entry,
      })
    },
    getContentSignedUrls(requests, eventId) {
      return socket.timeout(SOCKET_RESPONSE_TIMEOUT).emitWithAck('MODULE_API', {
        name: 'GET_CONTENT_SIGNED_URLS',
        data: { eventId, requests },
      })
    },
    getMetadataSignedUrls(requests, eventId) {
      return socket.timeout(SOCKET_RESPONSE_TIMEOUT).emitWithAck('MODULE_API', {
        name: 'GET_METADATA_SIGNED_URLS',
        data: {
          eventId,
          requests,
        },
      })
    },
    updateContentAttributes(updates, eventId) {
      return socket.timeout(SOCKET_RESPONSE_TIMEOUT).emitWithAck('MODULE_API', {
        name: 'UPDATE_CONTENT_ATTRIBUTES',
        data: {
          eventId,
          updates,
        },
      })
    },
    updateContentMetadata(updates, eventId) {
      return socket.timeout(SOCKET_RESPONSE_TIMEOUT).emitWithAck('MODULE_API', {
        name: 'UPDATE_CONTENT_METADATA',
        data: {
          eventId,
          updates,
        },
      })
    },
    completeHandleEvent(eventId) {
      return socket.timeout(SOCKET_RESPONSE_TIMEOUT).emitWithAck('MODULE_API', {
        name: 'COMPLETE_HANDLE_EVENT',
        data: eventId,
      })
    },
    attemptStartHandleEvent(eventKeys: string[]) {
      return socket.timeout(SOCKET_RESPONSE_TIMEOUT).emitWithAck('MODULE_API', {
        name: 'ATTEMPT_START_HANDLE_EVENT',
        data: { eventKeys },
      })
    },
    failHandleEvent(eventId) {
      return socket.emitWithAck('MODULE_API', {
        name: 'FAIL_HANDLE_EVENT',
        data: eventId,
      })
    },
  }
}

interface ModuleAPIResponse<T> {
  result: T
  error?: { code: string; message: string }
}
export interface CoreServerMessageInterface {
  saveLogEntry: (entry: ModuleLogEntry) => Promise<boolean>
  attemptStartHandleEvent: (
    eventKeys: string[],
  ) => Promise<ModuleAPIResponse<ModuleEvent>>
  failHandleEvent: (
    eventId: string,
    error: { code: string; message: string },
  ) => Promise<void>
  completeHandleEvent: (eventId: string) => Promise<ModuleAPIResponse<void>>
  getMetadataSignedUrls: (
    objects: {
      folderId: string
      objectKey: string
      contentHash: string
      metadataHash: string
      method: 'GET' | 'PUT' | 'DELETE'
    }[],
    eventId?: string,
  ) => Promise<
    ModuleAPIResponse<{
      urls: { url: string; folderId: string; objectKey: string }[]
    }>
  >
  getContentSignedUrls: (
    objects: {
      folderId: string
      objectKey: string
      method: 'GET' | 'PUT' | 'DELETE'
    }[],
    eventId?: string,
  ) => Promise<
    ModuleAPIResponse<{
      urls: { url: string; folderId: string; objectKey: string }[]
    }>
  >
  updateContentAttributes: (
    updates: {
      folderId: string
      objectKey: string
      hash: string
      attributes: ContentAttributesType
    }[],
    eventId?: string,
  ) => Promise<ModuleAPIResponse<void>>
  updateContentMetadata: (
    updates: {
      folderId: string
      objectKey: string
      hash: string
      metadata: ContentMetadataType
    }[],
    eventId?: string,
  ) => Promise<ModuleAPIResponse<void>>
}

export interface ModuleEvent {
  id: string
  eventKey: string
  data: any
}

export class ModuleAPIError extends Error {
  errorCode: string
  constructor(errorCode: string, errorMessage: string = '') {
    super()
    this.errorCode = errorCode
    this.message = errorMessage
  }
}

export const connectAndPerformWork = (
  socketBaseUrl: string,
  moduleWorkerId: string,
  moduleToken: string,
  eventHandlers: {
    [eventName: string]: (
      event: ModuleEvent,
      serverClient: CoreServerMessageInterface,
    ) => Promise<void>
  },
  _log: (entry: Partial<ModuleLogEntry>) => void,
) => {
  const eventSubscriptionKeys = Object.keys(eventHandlers)
  const socket = io(`${socketBaseUrl}`, {
    auth: {
      moduleWorkerId,
      token: moduleToken,
      eventSubscriptionKeys,
    },
    reconnection: false,
  })
  let concurrentTasks = 0

  const serverClient = buildModuleClient(socket)

  const shutdown = () => {
    socket.disconnect()
  }

  const wait = new Promise<void>((resolve, reject) => {
    socket.on('connect', () => {
      console.log('Worker connected.')
    })
    socket.on('disconnect', (reason) => {
      console.log('Worker disconnected. Reason:', reason)
      _log({
        message: 'Core module worker websocket disconnected.',
        name: 'CoreModuleWorkerDisconnect',
        data: {
          moduleWorkerId,
        },
      })
      resolve()
    })
    socket.onAny((_data) => {
      console.log('Got event in worker thread:', _data)
    })

    socket.on('PENDING_EVENTS_NOTIFICATION', async (_data) => {
      if (concurrentTasks < 10) {
        try {
          concurrentTasks++
          const attemptStartHandleResponse =
            await serverClient.attemptStartHandleEvent(eventSubscriptionKeys)
          const event = attemptStartHandleResponse.result
          if (attemptStartHandleResponse.error) {
            const errorMessage = `${attemptStartHandleResponse.error.code} - ${attemptStartHandleResponse.error.message}`
            _log({ message: errorMessage, name: 'Error' })
          } else {
            await eventHandlers[event.eventKey](event, serverClient)
              .then(() => serverClient.completeHandleEvent(event.id))
              .catch((e) => {
                return serverClient.failHandleEvent(event.id, {
                  code:
                    e instanceof ModuleAPIError
                      ? e.errorCode
                      : 'MODULE_WORKER_EXECUTION_ERROR',
                  message: `${e.name}: ${e.message}`,
                })
              })
          }
        } finally {
          concurrentTasks--
        }
      }
    })

    socket.on('error', (error) => {
      console.log('Socket error:', error, moduleWorkerId)
      _log({
        message: 'Core module worker websocket disconnected.',
        name: 'CoreModuleWorkerSocketError',
        level: 'error',
        data: {
          moduleWorkerId,
          name: error.name,
          stacktrace: error.stacktrace,
          message: error.message,
        },
      })
      socket.close()
      reject(error)
    })
  })

  return {
    shutdown,
    wait,
  }
}
