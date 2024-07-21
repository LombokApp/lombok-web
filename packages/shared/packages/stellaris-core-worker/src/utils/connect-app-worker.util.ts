import type {
  ContentAttributesType,
  ContentMetadataType,
  AppLogEntry,
} from '@stellariscloud/types'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'

const SOCKET_RESPONSE_TIMEOUT = 2000

export const buildAppClient = (socket: Socket): CoreServerMessageInterface => {
  return {
    saveLogEntry(entry) {
      return socket.timeout(SOCKET_RESPONSE_TIMEOUT).emitWithAck('APP_API', {
        name: 'SAVE_LOG_ENTRY',
        data: entry,
      })
    },
    getContentSignedUrls(requests, eventId) {
      return socket.timeout(SOCKET_RESPONSE_TIMEOUT).emitWithAck('APP_API', {
        name: 'GET_CONTENT_SIGNED_URLS',
        data: { eventId, requests },
      })
    },
    getMetadataSignedUrls(requests, eventId) {
      return socket.timeout(SOCKET_RESPONSE_TIMEOUT).emitWithAck('APP_API', {
        name: 'GET_METADATA_SIGNED_URLS',
        data: {
          eventId,
          requests,
        },
      })
    },
    updateContentAttributes(updates, eventId) {
      return socket.timeout(SOCKET_RESPONSE_TIMEOUT).emitWithAck('APP_API', {
        name: 'UPDATE_CONTENT_ATTRIBUTES',
        data: {
          eventId,
          updates,
        },
      })
    },
    updateContentMetadata(updates, eventId) {
      return socket.timeout(SOCKET_RESPONSE_TIMEOUT).emitWithAck('APP_API', {
        name: 'UPDATE_CONTENT_METADATA',
        data: {
          eventId,
          updates,
        },
      })
    },
    completeHandleEvent(eventId) {
      return socket.timeout(SOCKET_RESPONSE_TIMEOUT).emitWithAck('APP_API', {
        name: 'COMPLETE_HANDLE_EVENT',
        data: eventId,
      })
    },
    attemptStartHandleEvent(eventKeys: string[]) {
      return socket.timeout(SOCKET_RESPONSE_TIMEOUT).emitWithAck('APP_API', {
        name: 'ATTEMPT_START_HANDLE_EVENT',
        data: { eventKeys },
      })
    },
    failHandleEvent(eventId) {
      return socket.emitWithAck('APP_API', {
        name: 'FAIL_HANDLE_EVENT',
        data: eventId,
      })
    },
  }
}

interface AppAPIResponse<T> {
  result: T
  error?: { code: string; message: string }
}
export interface CoreServerMessageInterface {
  saveLogEntry: (entry: AppLogEntry) => Promise<boolean>
  attemptStartHandleEvent: (
    eventKeys: string[],
  ) => Promise<AppAPIResponse<AppEvent>>
  failHandleEvent: (
    eventId: string,
    error: { code: string; message: string },
  ) => Promise<void>
  completeHandleEvent: (eventId: string) => Promise<AppAPIResponse<void>>
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
    AppAPIResponse<{
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
    AppAPIResponse<{
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
  ) => Promise<AppAPIResponse<void>>
  updateContentMetadata: (
    updates: {
      folderId: string
      objectKey: string
      hash: string
      metadata: ContentMetadataType
    }[],
    eventId?: string,
  ) => Promise<AppAPIResponse<void>>
}

export interface AppEvent {
  id: string
  eventKey: string
  data: any
}

export class AppAPIError extends Error {
  errorCode: string
  constructor(errorCode: string, errorMessage: string = '') {
    super()
    this.errorCode = errorCode
    this.message = errorMessage
  }
}

export const connectAndPerformWork = (
  socketBaseUrl: string,
  appWorkerId: string,
  appToken: string,
  eventHandlers: {
    [eventName: string]: (
      event: AppEvent,
      serverClient: CoreServerMessageInterface,
    ) => Promise<void>
  },
  _log: (entry: Partial<AppLogEntry>) => void,
) => {
  const eventSubscriptionKeys = Object.keys(eventHandlers)
  const socket = io(`${socketBaseUrl}/apps`, {
    auth: {
      appWorkerId,
      token: appToken,
      eventSubscriptionKeys,
    },
    reconnection: false,
  })
  let concurrentTasks = 0

  const serverClient = buildAppClient(socket)

  const shutdown = () => {
    socket.disconnect()
  }

  const wait = new Promise<void>((resolve, reject) => {
    socket.on('connect', () => {
      console.log('App Worker "%s" connected.', appWorkerId)
    })
    socket.on('disconnect', (reason) => {
      console.log('Worker disconnected. Reason:', reason)
      _log({
        message: 'Core app worker websocket disconnected.',
        name: 'CoreAppWorkerDisconnect',
        data: {
          appWorkerId,
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
                    e instanceof AppAPIError
                      ? e.errorCode
                      : 'APP_WORKER_EXECUTION_ERROR',
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
      console.log('Socket error:', error, appWorkerId)
      _log({
        message: 'Core app worker websocket disconnected.',
        name: 'CoreAppWorkerSocketError',
        level: 'error',
        data: {
          appWorkerId,
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
