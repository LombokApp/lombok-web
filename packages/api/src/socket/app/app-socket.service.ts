import {
  CORE_APP_SLUG,
  EXECUTE_SYSTEM_REQUEST_MESSAGE,
  JsonSerializableValue,
} from '@lombokapp/types'
import { Injectable, Logger, Scope } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import type { Namespace, Socket } from 'socket.io'
import { appsTable } from 'src/app/entities/app.entity'
import { OrmService } from 'src/orm/orm.service'
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
  constructor(private readonly ormService: OrmService) {}

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

  notifyAppWorkersOfPendingTasks(
    appIdentifier: string,
    taskIdentifier: string,
    count: number,
  ) {
    this.logger.verbose('Broadcasting pending tasks message:', {
      appIdentifier,
      taskIdentifier,
      count,
    })
    if (this.namespace) {
      this.namespace
        .to(this.getRoomKeyForAppAndTask(appIdentifier, taskIdentifier))
        .emit('PENDING_TASKS_NOTIFICATION', {
          taskIdentifier,
          count,
        })
    } else {
      this.logger.error(
        'Namespace not yet set when emitting PENDING_TASKS_NOTIFICATION.',
      )
    }
  }

  async executeSynchronousAppRequest(
    appIdentifier: string,
    request: {
      url: string
      body: JsonSerializableValue
    },
    timeoutMs = 60000, // 60 second default timeout
  ): Promise<unknown> {
    this.logger.log('Executing synchronous request for app:', {
      appIdentifier,
      request,
    })

    // The core app is the only app that can execute synchronous requests of other apps
    const coreApp = await this.ormService.db.query.appsTable.findFirst({
      where: eq(appsTable.slug, CORE_APP_SLUG),
    })

    const clientIds = coreApp
      ? this.appIdentifierToClientIds.get(coreApp.identifier)
      : undefined
    if (!coreApp || !clientIds || clientIds.size === 0) {
      throw new Error(`No connected core app clients`)
    }

    // Get the first connected client for the core app
    const clientId = Array.from(clientIds)[0]
    const socket =
      clientId && this.connectedAppWorkers.has(clientId)
        ? this.connectedAppWorkers.get(clientId)
        : undefined
    if (!socket) {
      throw new Error(`Socket not found for client "${clientId}"`)
    }

    // Send message and wait for response using emitWithAck
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(`Timeout waiting for response from app "${appIdentifier}"`),
        )
      }, timeoutMs)

      void socket
        .emitWithAck(EXECUTE_SYSTEM_REQUEST_MESSAGE, { appIdentifier, request })
        .then((response: unknown) => {
          clearTimeout(timeout)
          resolve(response)
        })
        .catch((error: unknown) => {
          clearTimeout(timeout)
          if (error instanceof Error) {
            reject(error)
          } else {
            reject(new Error(String(error)))
          }
        })
    })
  }
}
