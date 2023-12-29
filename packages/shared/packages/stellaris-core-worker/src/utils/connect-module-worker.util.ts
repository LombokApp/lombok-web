import type {
  ContentAttributesType,
  ContentMetadataType,
  ModuleLogEntry,
} from '@stellariscloud/types'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'

export const buildModuleClient = (
  socket: Socket,
): CoreServerMessageInterface => {
  return {
    saveLogEntry(entry) {
      return socket.emitWithAck('MODULE_API', {
        name: 'SAVE_LOG_ENTRY',
        data: entry,
      })
    },
    getSignedUrls(requests) {
      return socket.emitWithAck('MODULE_API', {
        name: 'GET_SIGNED_URLS',
        data: requests,
      })
    },
    getMetadataSignedUrls(requests) {
      return socket.emitWithAck('MODULE_API', {
        name: 'GET_METADATA_SIGNED_URLS',
        data: requests,
      })
    },
    updateContentAttributes(updates, eventId) {
      return socket.emitWithAck('MODULE_API', {
        name: 'UPDATE_CONTENT_ATTRIBUTES',
        data: {
          eventId,
          updates,
        },
      })
    },
    updateContentMetadata(updates, eventId) {
      return socket.emitWithAck('MODULE_API', {
        name: 'UPDATE_CONTENT_METADATA',
        data: {
          eventId,
          updates,
        },
      })
    },
    completeHandleEvent(eventId) {
      return socket.emitWithAck('MODULE_API', {
        name: 'COMPLETE_HANDLE_EVENT',
        data: eventId,
      })
    },
    startHandleEvent(eventId) {
      return socket.emitWithAck('MODULE_API', {
        name: 'START_HANDLE_EVENT',
        data: eventId,
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

export interface CoreServerMessageInterface {
  saveLogEntry: (entry: ModuleLogEntry) => Promise<boolean>
  startHandleEvent: (eventId: string) => Promise<boolean>
  failHandleEvent: (
    eventId: string,
    error: { code: string; message: string },
  ) => Promise<void>
  completeHandleEvent: (eventId: string) => Promise<void>
  getMetadataSignedUrls: (
    eventId: string,
    objects: {
      folderId: string
      objectKey: string
      metadataHash: string
      method: 'GET' | 'PUT' | 'DELETE'
    }[],
  ) => Promise<string[]>
  getSignedUrls: (
    objects: {
      folderId: string
      objectKey: string
      method: 'GET' | 'PUT' | 'DELETE'
    }[],
  ) => Promise<string[]>
  updateContentAttributes: (
    updates: {
      folderId: string
      objectKey: string
      hash: string
      attributes: ContentAttributesType
    }[],
    eventId?: string,
  ) => Promise<void>
  updateContentMetadata: (
    updates: {
      folderId: string
      objectKey: string
      hash: string
      metadata: ContentMetadataType
    }[],
    eventId?: string,
  ) => Promise<void>
}

export interface ModuleEvent {
  id: string
  name: string
  data: {
    folderId: string
    objectKey?: string
  }
}

export const connectAndPerformWork = (
  socketBaseUrl: string,
  moduleId: string,
  moduleToken: string,
  externalId: string,
  eventHandlers: {
    [eventName: string]: (
      event: ModuleEvent,
      serverClient: CoreServerMessageInterface,
    ) => Promise<void>
  },
  _log: (entry: Partial<ModuleLogEntry>) => void,
) => {
  const socket = io(`${socketBaseUrl}`, {
    query: { externalId },
    auth: { moduleId, token: moduleToken, name: externalId },
    reconnection: false,
  })

  const serverClient = buildModuleClient(socket)

  const shutdown = () => {
    socket.close()
  }

  const wait = new Promise<void>((resolve, reject) => {
    socket.on('connect', () => {
      console.log('Worker connected.', externalId)
      socket.on('EVENT', async (event: ModuleEvent) => {
        if (event.name in eventHandlers) {
          await serverClient.startHandleEvent(event.id)
          await eventHandlers[event.name](event, serverClient)
            .then(() => serverClient.completeHandleEvent(event.id))
            .catch((e) =>
              serverClient.failHandleEvent(event.id, {
                code: 'MODULE_WORKER_EXECUTION_ERROR',
                message: `${e.name}: ${e.message}`,
              }),
            )
        }
      })
    })

    socket.on('disconnect', (reason) => {
      console.log('Worker disconnected. Reason:', reason)
      resolve()
    })

    socket.on('error', (error) => {
      console.log('Socker error:', error, externalId)
      socket.close()
      reject(error)
    })
  })

  return {
    shutdown,
    wait,
  }
}
