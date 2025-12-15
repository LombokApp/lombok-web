import { ExternalAppWorker } from '@lombokapp/types'
import { safeZodParse } from '@lombokapp/utils'
import { Logger, UnauthorizedException } from '@nestjs/common'
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Jwt } from 'jsonwebtoken'
import { Namespace, Socket } from 'socket.io'
import { AppService } from 'src/app/services/app.service'
import {
  APP_JWT_SUB_PREFIX,
  APP_WORKER_JWT_SUB_PREFIX,
  JWTService,
} from 'src/auth/services/jwt.service'
import { KVService } from 'src/cache/kv.service'
import { z } from 'zod'

import {
  APP_WORKER_INFO_CACHE_KEY_PREFIX,
  AppSocketService,
} from './app-socket.service'

export const AppSocketAuthPayload = z.object({
  instanceId: z.string(),
  token: z.string(),
  handledTaskIdentifiers: z.array(z.string()).optional(),
})

@WebSocketGateway({
  cors: {
    origin: '*', // TODO: constrain this
    allowedHeaders: [],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/apps',
})
export class AppSocketGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer()
  public readonly namespace: Namespace | undefined
  private readonly logger = new Logger(AppSocketGateway.name)

  constructor(
    private readonly appSocketService: AppSocketService,
    private readonly jwtService: JWTService,
    private readonly kvService: KVService,
    private readonly appService: AppService,
  ) {}

  closeSocketAndReturnUnauthorized(socket: Socket): UnauthorizedException {
    socket.conn.close()
    socket.disconnect(true)
    return new UnauthorizedException()
  }

  afterInit(namespace: Namespace) {
    this.appSocketService.setNamespace(namespace)

    namespace.use((socket, next) => {
      try {
        // Do synchronous validation here
        const auth = socket.handshake.auth
        if (safeZodParse(auth, AppSocketAuthPayload)) {
          let jwt: Jwt | undefined
          try {
            jwt = this.jwtService.decodeJWT(auth.token)
          } catch (e: unknown) {
            this.logger.warn('Error decoding JWT:', e)
            next(this.closeSocketAndReturnUnauthorized(socket))
            return
          }

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
            next(this.closeSocketAndReturnUnauthorized(socket))
            return
          }
          void this.appService
            .getApp(appIdentifier, {
              enabled: true,
            })
            .then((app) => {
              if (!app) {
                this.logger.warn(
                  'App "%s" not recognised. Disconnecting...',
                  appIdentifier,
                )
                next(this.closeSocketAndReturnUnauthorized(socket))
                return
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
                this.logger.warn('SOCKET JWT VERIFY ERROR:', e)
                next(this.closeSocketAndReturnUnauthorized(socket))
              }

              const workerInfo: ExternalAppWorker = {
                appIdentifier,
                socketClientId: socket.id,
                handledTaskIdentifiers: auth.handledTaskIdentifiers ?? [], // TODO: validate worker reported task keys to match their config
                workerId: auth.instanceId,
                ip: socket.handshake.address,
              }
              const workerCacheKey = `${appIdentifier}:${auth.instanceId}`
              // persist worker state in memory
              void this.kvService.ops.set(
                `${APP_WORKER_INFO_CACHE_KEY_PREFIX}:${workerCacheKey}`,
                JSON.stringify(workerInfo),
              )

              // track socket by app identifier for bulk disconnects
              const existingSet =
                this.appSocketService.appIdentifierToClientIds.get(
                  appIdentifier,
                )
              if (existingSet) {
                existingSet.add(socket.id)
              } else {
                this.appSocketService.appIdentifierToClientIds.set(
                  appIdentifier,
                  new Set([socket.id]),
                )
              }

              socket.on('disconnect', () => {
                // cleanup app -> clientId mapping
                const appClientIds =
                  this.appSocketService.appIdentifierToClientIds.get(
                    appIdentifier,
                  )
                if (appClientIds) {
                  appClientIds.delete(socket.id)
                  if (appClientIds.size === 0) {
                    this.appSocketService.appIdentifierToClientIds.delete(
                      appIdentifier,
                    )
                  }
                }
                // Also cleanup from connectedAppWorkers
                this.appSocketService.connectedAppWorkers.delete(socket.id)

                void this.kvService.ops.del(
                  `${APP_WORKER_INFO_CACHE_KEY_PREFIX}:${workerCacheKey}`,
                )
              })
              const clientId = socket.id
              this.appSocketService.connectedAppWorkers.set(clientId, socket)
              return Promise.all(
                (auth.handledTaskIdentifiers ?? []).map(
                  async (taskIdentifier) => {
                    const roomKey =
                      this.appSocketService.getRoomKeyForAppAndTask(
                        appIdentifier,
                        taskIdentifier,
                      )
                    return socket.join(roomKey)
                  },
                ),
                // eslint-disable-next-line promise/no-nesting
              ).then(() => {
                socket.onAny((event: string, ...args: unknown[]) => {
                  if (event === 'APP_API') {
                    // Let APP_API handler work normally
                    return
                  }

                  // For any other event, find the ack callback and return an error
                  const lastArg = args[args.length - 1]
                  if (
                    typeof lastArg === 'function' &&
                    lastArg instanceof Function
                  ) {
                    // This is an ack callback
                    ;(
                      lastArg as (response: {
                        error: {
                          code: 400
                          message: 'Invalid event'
                        }
                      }) => void
                    )({
                      error: {
                        code: 400,
                        message: 'Invalid event',
                      },
                    })
                  } else {
                    // No ack callback, just log the invalid event
                    this.logger.warn(`Invalid event received: ${event}`)
                  }
                })

                socket.on(
                  'APP_API',
                  async (
                    message: string,
                    ack?: (response: unknown) => void,
                  ) => {
                    this.logger.log('APP Message Request:', {
                      message,
                      instanceId: auth.instanceId,
                      appIdentifier,
                    })
                    const response = await this.appService
                      .handleAppRequest(auth.instanceId, appIdentifier, message)
                      // eslint-disable-next-line promise/no-nesting
                      .catch((error: unknown) => {
                        this.logger.error(
                          'Unexpected error during message handling:',
                          {
                            message,
                            error,
                          },
                        )
                        return {
                          error: {
                            code: '500',
                            message: 'Unexpected error.',
                          },
                        }
                      })
                    if ('error' in response) {
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
                    ack?.(response)
                  },
                )
              })
            })
            .then(() => next())
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          next(error)
        } else {
          next(new Error('Unknown error'))
        }
      }
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async handleConnection(_socket: Socket): Promise<void> {}
}
