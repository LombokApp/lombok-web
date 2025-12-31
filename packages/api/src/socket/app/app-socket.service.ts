import { Injectable, Logger, Scope } from '@nestjs/common'
import type { Namespace, Socket } from 'socket.io'
import { z } from 'zod'

export const AppSocketAuthPayload = z.object({
  instanceId: z.string(),
  token: z.string(),
  handledTaskIdentifiers: z.array(z.string()).optional(),
})

export const APP_WORKER_INFO_CACHE_KEY_PREFIX = 'APP_WORKER'

@Injectable({ scope: Scope.DEFAULT })
export class AppSocketService {
  public readonly connectedAppWorkers = new Map<string, Socket>()
  public readonly appIdentifierToClientIds = new Map<string, Set<string>>()

  private namespace: Namespace | undefined
  setNamespace(namespace: Namespace) {
    this.namespace = namespace
  }

  private readonly logger = new Logger(AppSocketService.name)

  getRoomKeyForAppAndTask(appIdentifier: string, taskIdentifier: string) {
    return `${appIdentifier}__task:${taskIdentifier}`
  }

  disconnectAllClientsByAppIdentifier(appIdentifier: string) {
    const clientIds = this.appIdentifierToClientIds.get(appIdentifier)
    if (!clientIds || clientIds.size === 0) {
      this.logger.log(
        `No connected clients to disconnect for app "${appIdentifier}"`,
      )
      return
    }

    this.logger.log(
      `Disconnecting ${clientIds.size} clients for app "${appIdentifier}"`,
    )

    // copy to avoid mutation during disconnect events
    const idsToDisconnect = Array.from(clientIds)
    for (const clientId of idsToDisconnect) {
      const socket = this.connectedAppWorkers.get(clientId)
      if (socket) {
        try {
          socket.disconnect(true)
        } catch (error) {
          this.logger.error(
            `Error disconnecting client ${clientId} for app ${appIdentifier}`,
            error as Error,
          )
        }
      }
    }
  }
}
