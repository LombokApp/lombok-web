import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { ConnectedAppWorker } from '@stellariscloud/types'
import * as r from 'runtypes'
import type { Namespace, Socket } from 'socket.io'
import { AppService } from 'src/app/services/app.service'
import { KVService } from 'src/cache/kv.service'

import { JWTService } from '../../auth/services/jwt.service'

const AppAuthPayload = r.Record({
  appWorkerId: r.String,
  token: r.String,
  handledTaskKeys: r.Array(r.String),
})

export const APP_WORKER_INFO_CACHE_KEY_PREFIX = 'APP_WORKER'

@Injectable()
export class AppSocketService {
  private readonly connectedClients: Map<string, Socket> = new Map()

  private namespace: Namespace | undefined
  setNamespace(namespace: Namespace) {
    this.namespace = namespace
  }

  private readonly appService: AppService

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly jwtService: JWTService,
    private readonly kvService: KVService,
  ) {
    this.appService = this.moduleRef.get(AppService)
  }

  async handleConnection(socket: Socket): Promise<void> {
    // console.log(
    //   'AppSocketService handleConnection from:',
    //   socket.client.conn.remoteAddress,
    // )

    const clientId = socket.id
    this.connectedClients.set(clientId, socket)
    socket.on('disconnect', () => {
      this.connectedClients.delete(clientId)
    })

    // Handle other messages from the client
    const auth = socket.handshake.auth
    if (AppAuthPayload.guard(auth)) {
      const jwt = this.jwtService.decodeJWT(auth.token)
      const sub = jwt.payload.sub as string | undefined
      const appIdentifier = sub?.startsWith('APP:')
        ? sub.slice('APP:'.length)
        : undefined

      if (!appIdentifier) {
        // eslint-disable-next-line no-console
        console.log('No app identifier in jwt')
        socket.disconnect(true)
        throw new UnauthorizedException()
      }
      const app = await this.appService.getApp(appIdentifier)
      if (!app) {
        // eslint-disable-next-line no-console
        console.log('App "%s" not recognised. Disconnecting...', appIdentifier)
        socket.disconnect(true)
        throw new UnauthorizedException()
      }

      try {
        // verifies the token using the publicKey we have on file for this app
        this.jwtService.verifyAppJWT({
          appIdentifier,
          publicKey: app.publicKey,
          token: auth.token,
        })
        // console.log('verifiedJwt:', _verifiedJwt)
      } catch (e: unknown) {
        // eslint-disable-next-line no-console
        console.log('SOCKET JWT VERIFY ERROR:', e)
        socket.disconnect(true)
        throw new UnauthorizedException()
      }
      const workerInfo: ConnectedAppWorker = {
        appIdentifier,
        socketClientId: socket.id,
        handledTaskKeys: auth.handledTaskKeys, // TODO: validate worker reported task keys to match their config
        workerId: auth.appWorkerId,
        ip: socket.handshake.address,
      }
      const workerCacheKey = `${appIdentifier}:${auth.appWorkerId}`
      // persist worker state in memory
      void this.kvService.ops.set(
        `${APP_WORKER_INFO_CACHE_KEY_PREFIX}:${workerCacheKey}`,
        JSON.stringify(workerInfo),
      )

      // register listener for requests from the app
      socket.on(
        'APP_API',
        async (message: string, ack: (response: unknown) => void) => {
          // eslint-disable-next-line no-console
          console.log('APP Message Request:', {
            message,
            auth,
            appIdentifier,
          })
          const response = await this.appService
            .handleAppRequest(auth.appWorkerId, appIdentifier, message)
            .catch((error: unknown) => {
              // eslint-disable-next-line no-console
              console.log('Unexpected error during message handling:', {
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
          if (response?.error) {
            // eslint-disable-next-line no-console
            console.log('APP Message Error:', {
              message,
              auth,
              appIdentifier,
              error: response.error,
            })
          } else {
            // eslint-disable-next-line no-console
            console.log('APP Message Response:', {
              message,
              auth,
              appIdentifier,
              response,
            })
          }
          ack(response)
        },
      )

      socket.on('disconnect', () => {
        void this.kvService.ops.del(
          `${APP_WORKER_INFO_CACHE_KEY_PREFIX}:${workerCacheKey}`,
        )
      })
      // add the clients to the rooms corresponding to their subscriptions
      await Promise.all(
        auth.handledTaskKeys.map((taskKey) => {
          const roomKey = this.getRoomKeyForAppAndTask(appIdentifier, taskKey)
          return socket.join(roomKey)
        }),
      )
    } else {
      // auth payload does not match expected
      // eslint-disable-next-line no-console
      console.log('Bad auth payload.', auth)
      socket.disconnect(true)
      throw new UnauthorizedException()
    }
  }

  getRoomKeyForAppAndTask(appIdentifier: string, taskKey: string) {
    return `app:${appIdentifier.toLowerCase()}__task:${taskKey}`
  }

  notifyAppWorkersOfPendingTasks(
    appIdentifier: string,
    taskKey: string,
    count: number,
  ) {
    // eslint-disable-next-line no-console
    console.log('Broadcasting pending tasks message:', {
      appIdentifier,
      taskKey,
      count,
    })
    if (this.namespace) {
      this.namespace
        .to(this.getRoomKeyForAppAndTask(appIdentifier, taskKey))
        .emit('PENDING_TASKS_NOTIFICATION', { taskKey, count })
    } else {
      // eslint-disable-next-line no-console
      console.log(
        'Namespace not yet set when emitting PENDING_TASKS_NOTIFICATION.',
      )
    }
  }
}
