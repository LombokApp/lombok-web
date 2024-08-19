import type { OnModuleInit } from '@nestjs/common'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import * as r from 'runtypes'
import type { Namespace, Socket } from 'socket.io'
import { AppService } from 'src/app/services/app.service'
import { KVService } from 'src/cache/kv.service'

import { JWTService } from '../../auth/services/jwt.service'

const AppAuthPayload = r.Record({
  appWorkerId: r.String,
  token: r.String,
  eventSubscriptionKeys: r.Array(r.String),
})

const APP_WORKER_INFO_CACHE_KEY_PREFIX = 'APP_WORKER'

@Injectable()
export class AppSocketService implements OnModuleInit {
  private readonly connectedClients: Map<string, Socket> = new Map()
  private readonly connectedAppWorkers: Map<
    string,
    {
      appIdentifier: string
      socketClientId: string
      name: string
      ip: string
    }
  > = new Map()

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
    console.log(
      'AppSocketService handleConnection from:',
      socket.client.conn.remoteAddress,
    )

    const clientId = socket.id
    this.connectedClients.set(clientId, socket)
    socket.on('disconnect', () => {
      this.connectedClients.delete(clientId)
    })

    // Handle other events and messages from the client
    const auth = socket.handshake.auth
    if (AppAuthPayload.guard(auth)) {
      const jwt = this.jwtService.decodeJWT(auth.token)
      const sub = jwt.payload.sub as string | undefined
      const appIdentifier = sub?.startsWith('APP:')
        ? sub.slice('APP:'.length)
        : undefined

      if (!appIdentifier) {
        console.log('No app identifier in jwt')
        socket.disconnect(true)
        throw new UnauthorizedException()
      }
      const app = await this.appService.getApp(appIdentifier)
      if (!app) {
        console.log('App "%s" not recognised. Disconnecting...', appIdentifier)
        socket.disconnect(true)
        throw new UnauthorizedException()
      }

      try {
        // verifies the token using the publicKey we have on file for this app
        const _verifiedJwt = this.jwtService.verifyAppJWT({
          appIdentifier,
          publicKey: app.publicKey,
          token: auth.token,
        })
        // console.log('verifiedJwt:', _verifiedJwt)
      } catch (e: any) {
        console.log('SOCKET JWT VERIFY ERROR:', e)
        socket.disconnect(true)
        throw new UnauthorizedException()
      }
      const workerInfo = {
        appIdentifier,
        socketClientId: socket.id,
        name: auth.appWorkerId,
        ip: socket.handshake.address,
      }
      const workerCacheKey = `${appIdentifier}:${auth.appWorkerId}`
      // persist worker state in memory
      void this.kvService.ops.set(
        `${APP_WORKER_INFO_CACHE_KEY_PREFIX}:${workerCacheKey}`,
        JSON.stringify(workerInfo),
      )

      // register listener for requests from the app
      socket.on('APP_API', async (message, ack) => {
        const response = await this.appService.handleAppRequest(
          auth.appWorkerId,
          appIdentifier,
          message,
        )
        if (response?.error) {
          console.log('APP Message Error:', {
            message,
            appIdentifier,
            error: response.error,
          })
        } else {
          console.log('APP Message Response:', {
            message,
            appIdentifier,
            response,
          })
        }
        return ack(response)
      })

      socket.on('disconnect', () => {
        void this.kvService.ops.del(
          `${APP_WORKER_INFO_CACHE_KEY_PREFIX}:${workerCacheKey}`,
        )
      })
      // add the clients to the rooms corresponding to their subscriptions
      await Promise.all(
        auth.eventSubscriptionKeys.map((eventKey) => {
          const roomKey = this.getRoomKeyForAppAndEvent(appIdentifier, eventKey)
          console.log('App worker joining room:', roomKey)
          return socket.join(roomKey)
        }),
      )
    } else {
      // auth payload does not match expected
      console.log('Bad auth payload.', auth)
      socket.disconnect(true)
      throw new UnauthorizedException()
    }
  }

  onModuleInit() {
    // this.asyncTaskService.registerProcessor(
    //   CoreTaskName.NotifyAppOfPendingEvents,
    //   async (task) => {
    //     console.log('Doing NotifyAllAppsOfPendingEvents task:', task)
    //     this.notifyAppWorkersOfPendingEvents(
    //       task.data.appIdentifier,
    //       task.data.eventKey,
    //       task.data.eventCount,
    //     )
    //   },
    // )
  }

  getRoomKeyForAppAndEvent(appIdentifier: string, eventKey: string) {
    const roomKey = `app:${appIdentifier}__event:${eventKey}`
    return roomKey
  }

  notifyAppWorkersOfPendingEvents(
    appIdentifier: string,
    eventKey: string,
    count: number,
  ) {
    if (this.namespace) {
      this.namespace
        .to(this.getRoomKeyForAppAndEvent(appIdentifier, eventKey))
        .emit('PENDING_EVENTS_NOTIFICATION', { eventKey, count })
    } else {
      console.log(
        'Namespace not yet set when emitting PENDING_EVENTS_NOTIFICATION.',
      )
    }
  }
}
