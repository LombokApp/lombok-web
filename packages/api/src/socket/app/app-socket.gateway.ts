import { safeZodParse } from '@lombokapp/utils'
import { Logger, UnauthorizedException } from '@nestjs/common'
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import crypto from 'crypto'
import { Namespace, Socket } from 'socket.io'
import { AppService } from 'src/app/services/app.service'
import { JWTService } from 'src/auth/services/jwt.service'
import { KVService } from 'src/cache/kv.service'
import { runWithThreadContext } from 'src/shared/thread-context'
import { z } from 'zod'

import {
  APP_RUNTIME_WORKER_SOCKET_STATE,
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
      const auth = socket.handshake.auth
      if (!safeZodParse(auth, AppSocketAuthPayload)) {
        next(new UnauthorizedException())
        return
      }
      void (async () => {
        try {
          const claims = await this.jwtService
            .verifyAppToken(auth.token)
            .catch((e: unknown) => {
              this.logger.warn('Error verifying app socket JWT:', e)
              return undefined
            })
          if (!claims) {
            next(this.closeSocketAndReturnUnauthorized(socket))
            return
          }
          if (claims.actorType !== 'app') {
            this.logger.warn(
              `App socket requires actor=app, got actor=${claims.actorType}`,
            )
            next(this.closeSocketAndReturnUnauthorized(socket))
            return
          }
          const appIdentifier = claims.appIdentifier
          const app = await this.appService.getApp(appIdentifier, {
            enabled: true,
          })
          if (!app) {
            this.logger.warn(
              'App "%s" not recognised. Disconnecting...',
              appIdentifier,
            )
            next(this.closeSocketAndReturnUnauthorized(socket))
            return
          }

          const workerInfo = {
            appIdentifier,
            socketClientId: socket.id,
            workerId: auth.instanceId,
            ip: socket.handshake.address,
          }

          // Derive a short, stable source tag for log prefixes.
          // Runtime workers connect with instanceId
          //   `worker-daemon--{workerIdentifier}--{executionId}`.
          // Other app-token connections (e.g. docker workers) use opaque
          // instanceIds — fall back to "app".
          const instanceParts = auth.instanceId.split('--')
          const logSourceTag =
            instanceParts[0] === 'worker-daemon' && instanceParts[1]
              ? `${appIdentifier}/${instanceParts[1]}`
              : `${appIdentifier}/app`
          const instanceKey = `${appIdentifier}:${auth.instanceId}`
          void this.kvService.ops.set(
            `${APP_RUNTIME_WORKER_SOCKET_STATE}:${instanceKey}`,
            JSON.stringify(workerInfo),
          )

          const existingSet =
            this.appSocketService.appIdentifierToClientIds.get(appIdentifier)
          if (existingSet) {
            existingSet.add(socket.id)
          } else {
            this.appSocketService.appIdentifierToClientIds.set(
              appIdentifier,
              new Set([socket.id]),
            )
          }

          socket.on('disconnect', () => {
            const appClientIds =
              this.appSocketService.appIdentifierToClientIds.get(appIdentifier)
            if (appClientIds) {
              appClientIds.delete(socket.id)
              if (appClientIds.size === 0) {
                this.appSocketService.appIdentifierToClientIds.delete(
                  appIdentifier,
                )
              }
            }
            this.appSocketService.connectedAppRuntimeWorkers.delete(socket.id)

            void this.kvService.ops.del(
              `${APP_RUNTIME_WORKER_SOCKET_STATE}:${instanceKey}`,
            )
          })
          const clientId = socket.id
          this.appSocketService.connectedAppRuntimeWorkers.set(clientId, socket)
          await Promise.all(
            (auth.handledTaskIdentifiers ?? []).map(async (taskIdentifier) => {
              const roomKey = this.appSocketService.getRoomKeyForAppAndTask(
                appIdentifier,
                taskIdentifier,
              )
              return socket.join(roomKey)
            }),
          )

          socket.onAny((event: string, ...args: unknown[]) => {
            if (event === 'APP_API') {
              return
            }
            const lastArg = args[args.length - 1]
            if (typeof lastArg === 'function' && lastArg instanceof Function) {
              ;(
                lastArg as (response: {
                  error: { code: 400; message: 'Invalid event' }
                }) => void
              )({
                error: { code: 400, message: 'Invalid event' },
              })
            } else {
              this.logger.warn(`Invalid event received: ${event}`)
            }
          })

          socket.on(
            'APP_API',
            async (message: unknown, ack?: (response: unknown) => void) => {
              const requestId = crypto.randomUUID()
              const messageName =
                (message as { name?: string } | null | undefined)?.name ??
                'UNKNOWN'
              const startedAt = Date.now()
              let response: unknown
              let threwUnexpected = false
              let unexpectedError: unknown
              try {
                response = await runWithThreadContext(requestId, async () => {
                  return this.appService
                    .handleAppRequest(auth.instanceId, appIdentifier, message)
                    .catch((error: unknown) => {
                      threwUnexpected = true
                      unexpectedError = error
                      return {
                        error: {
                          code: '500',
                          message: 'Unexpected error.',
                        },
                      }
                    })
                })
              } finally {
                const ms = Date.now() - startedAt
                const shortReq = requestId.slice(0, 8)
                const base = `[app:${logSourceTag}][api] ${messageName} ${ms}ms (${shortReq})`
                const errInfo =
                  response &&
                  typeof response === 'object' &&
                  'error' in response
                    ? (response as { error?: { message?: string } }).error
                    : undefined
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (threwUnexpected) {
                  this.logger.error(
                    `${base} threw unexpected error`,
                    unexpectedError,
                  )
                } else if (errInfo) {
                  this.logger.warn(
                    `${base} error: ${errInfo.message ?? 'unknown'}`,
                  )
                } else {
                  this.logger.log(base)
                }
              }

              ack?.(response)
            },
          )

          next()
        } catch (error: unknown) {
          if (error instanceof Error) {
            next(error)
          } else {
            next(new Error('Unknown error'))
          }
        }
      })()
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async handleConnection(_socket: Socket): Promise<void> {}
}
