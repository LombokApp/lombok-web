import { ExternalAppWorker } from '@lombokapp/types'
import { safeZodParse } from '@lombokapp/utils'
import {
  Injectable,
  Logger,
  Scope,
  UnauthorizedException,
} from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import type { Namespace, Socket } from 'socket.io'
import { AppService } from 'src/app/services/app.service'
import { KVService } from 'src/cache/kv.service'
import { z } from 'zod'

import {
  APP_JWT_SUB_PREFIX,
  APP_WORKER_JWT_SUB_PREFIX,
  JWTService,
} from '../../auth/services/jwt.service'

const AppAuthPayload = z.object({
  appWorkerId: z.string(),
  token: z.string(),
  handledTaskIdentifiers: z.array(z.string()).optional(),
})

export const APP_WORKER_INFO_CACHE_KEY_PREFIX = 'APP_WORKER'

@Injectable({ scope: Scope.DEFAULT })
export class AppSocketService {
  private readonly connectedAppWorkers = new Map<string, Socket>()
  private readonly appIdentifierToClientIds = new Map<string, Set<string>>()

  private namespace: Namespace | undefined
  setNamespace(namespace: Namespace) {
    this.namespace = namespace
  }

  private readonly appService: AppService
  private readonly logger = new Logger(AppSocketService.name)

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly jwtService: JWTService,
    private readonly kvService: KVService,
  ) {
    this.appService = this.moduleRef.get(AppService)
  }

  async handleConnection(socket: Socket): Promise<void> {
    this.logger.debug(
      `handleConnection from: ${socket.client.conn.remoteAddress}`,
    )

    const clientId = socket.id
    this.connectedAppWorkers.set(clientId, socket)

    // Handle other messages from the client
    const auth = socket.handshake.auth
    if (safeZodParse(auth, AppAuthPayload)) {
      const jwt = this.jwtService.decodeJWT(auth.token)
      const sub = jwt.payload.sub as string | undefined
      const isExternalAppToken = sub?.startsWith(APP_JWT_SUB_PREFIX)
      const isAppWorkerToken = sub?.startsWith(APP_WORKER_JWT_SUB_PREFIX)

      const appIdentifier = isExternalAppToken
        ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          sub!.slice(APP_JWT_SUB_PREFIX.length)
        : isAppWorkerToken
          ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            sub!.slice(APP_WORKER_JWT_SUB_PREFIX.length)
          : undefined

      if (!appIdentifier) {
        this.logger.warn(`No app identifier in jwt - sub: ${sub}`)
        socket.disconnect(true)
        throw new UnauthorizedException()
      }
      const app = await this.appService.getAppAsAdmin(appIdentifier, {
        enabled: true,
      })
      if (!app) {
        this.logger.warn(
          'App "%s" not recognised. Disconnecting...',
          appIdentifier,
        )
        socket.disconnect(true)
        throw new UnauthorizedException()
      }

      try {
        // verifies the token using the publicKey we have on file for this app
        if (isExternalAppToken) {
          this.jwtService.verifyAppJWT({
            appIdentifier,
            publicKey: app.publicKey,
            token: auth.token,
          })
        } else if (isAppWorkerToken) {
          this.jwtService.verifyAppWorkerToken({
            appIdentifier,
            token: auth.token,
          })
        }
      } catch (e: unknown) {
        this.logger.error('SOCKET JWT VERIFY ERROR:', e)
        socket.disconnect(true)
        throw new UnauthorizedException()
      }
      const workerInfo: ExternalAppWorker = {
        appIdentifier,
        socketClientId: socket.id,
        handledTaskIdentifiers: auth.handledTaskIdentifiers ?? [], // TODO: validate worker reported task keys to match their config
        workerId: auth.appWorkerId,
        ip: socket.handshake.address,
      }
      const workerCacheKey = `${appIdentifier}:${auth.appWorkerId}`
      // persist worker state in memory
      void this.kvService.ops.set(
        `${APP_WORKER_INFO_CACHE_KEY_PREFIX}:${workerCacheKey}`,
        JSON.stringify(workerInfo),
      )

      // track socket by app identifier for bulk disconnects
      const existingSet = this.appIdentifierToClientIds.get(appIdentifier)
      if (existingSet) {
        existingSet.add(socket.id)
      } else {
        this.appIdentifierToClientIds.set(appIdentifier, new Set([socket.id]))
      }

      // register listener for requests from the app
      socket.on(
        'APP_API',
        async (message: string, ack: (response: unknown) => void) => {
          this.logger.log('APP Message Request:', {
            message,
            appWorkerId: auth.appWorkerId,
            appIdentifier,
          })
          const response = await this.appService
            .handleAppRequest(auth.appWorkerId, appIdentifier, message)
            .catch((error: unknown) => {
              this.logger.error('Unexpected error during message handling:', {
                message,
                error,
              })
              return {
                error: {
                  code: '500',
                  message: 'Unexpected error.',
                },
              }
            })
          if (response.error) {
            this.logger.log('APP Message Error:', {
              message,
              appIdentifier,
              error: response.error,
            })
          } else {
            this.logger.log('APP Message Response:', {
              message,
              appIdentifier,
              response,
            })
          }
          ack(response)
        },
      )

      socket.on('disconnect', () => {
        // cleanup app -> clientId mapping
        const appClientIds = this.appIdentifierToClientIds.get(appIdentifier)
        if (appClientIds) {
          appClientIds.delete(socket.id)
          if (appClientIds.size === 0) {
            this.appIdentifierToClientIds.delete(appIdentifier)
          }
        }
        // Also cleanup from connectedAppWorkers
        this.connectedAppWorkers.delete(socket.id)

        void this.kvService.ops.del(
          `${APP_WORKER_INFO_CACHE_KEY_PREFIX}:${workerCacheKey}`,
        )
      })
      // add the clients to the rooms corresponding to their subscriptions
      await Promise.all(
        (auth.handledTaskIdentifiers ?? []).map((taskIdentifier) => {
          const roomKey = this.getRoomKeyForAppAndTask(
            appIdentifier,
            taskIdentifier,
          )
          return socket.join(roomKey)
        }),
      )
    } else {
      // auth payload does not match expected

      this.logger.warn('Bad auth payload.', auth)
      socket.disconnect(true)
      throw new UnauthorizedException()
    }
  }

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
}
