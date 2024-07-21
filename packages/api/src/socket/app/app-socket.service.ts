import type { OnModuleInit } from '@nestjs/common'
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { ModuleRef } from '@nestjs/core'
import { createAdapter } from '@socket.io/redis-adapter'
import type { ConnectedAppInstance } from '@stellariscloud/types'
import * as r from 'runtypes'
import { Socket } from 'socket.io'
import * as io from 'socket.io'
import { AppService } from 'src/app/services/app.service'
import { redisConfig } from 'src/cache/redis.config'
import { RedisService } from 'src/cache/redis.service'

import { JWTService } from '../../auth/services/jwt.service'

const AppAuthPayload = r.Record({
  appWorkerId: r.String,
  token: r.String,
  eventSubscriptionKeys: r.Array(r.String),
})

@Injectable()
export class AppSocketService implements OnModuleInit {
  private readonly connectedClients: Map<string, Socket> = new Map()
  private appService: AppService
  private server?: io.Server

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly jwtService: JWTService,
    private readonly redisService: RedisService,
    @Inject(redisConfig.KEY)
    private readonly _redisConfig: nestjsConfig.ConfigType<typeof redisConfig>,
  ) {}

  setServer(server: io.Server) {
    this.server = server

    if (this._redisConfig.enabled) {
      this.server.adapter(
        createAdapter(
          this.redisService.client,
          this.redisService.client.duplicate(),
        ),
      )
    }
  }

  async handleConnection(socket: Socket): Promise<void> {
    console.log('AppSocketService handleConnection:', socket.nsp.name)

    // console.log('SERVER SOCKET handleConnection:', socket)
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

      // persist worker state to redis
      const workerRedisStateKey = `APP_WORKER:${appIdentifier}:${auth.appWorkerId}`
      void this.redisService.client.SET(
        workerRedisStateKey,
        JSON.stringify({
          appIdentifier,
          socketClientId: socket.id,
          name: auth.appWorkerId,
          ip: socket.handshake.address,
        }),
      )

      // register listener for requests from the app
      socket.on('APP_API', async (message, ack) => {
        const response = await this.appService.handleAppRequest(
          auth.appWorkerId,
          appIdentifier,
          message,
        )
        return ack(response)
      })

      socket.on('disconnect', () => {
        // remove client state from redis
        console.log('Removing worker state from redis...')
        void this.redisService.client.del(workerRedisStateKey)
      })
      // add the clients to the rooms corresponding to their subscriptions
      await Promise.all(
        auth.eventSubscriptionKeys.map((eventKey) => {
          const roomKey = `app:${appIdentifier}__event:${eventKey}`
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
    this.appService = this.moduleRef.get(AppService)
  }

  notifyAppWorkersOfPendingEvents(
    appId: string,
    eventKey: string,
    count: number,
  ) {
    const roomKey = `app:${appId}__event:${eventKey}`
    this.server
      ?.to(roomKey)
      .emit('PENDING_EVENTS_NOTIFICATION', { eventKey, count })
  }

  async getAppConnections(): Promise<{
    [key: string]: ConnectedAppInstance[]
  }> {
    let cursor = 0
    let started = false
    let keys: string[] = []
    while (!started || cursor !== 0) {
      started = true
      const scanResult = await this.redisService.client.scan(cursor, {
        MATCH: 'APP_WORKER:*',
        TYPE: 'string',
        COUNT: 10000,
      })
      keys = keys.concat(scanResult.keys)
      cursor = scanResult.cursor
    }

    return keys.length
      ? (await this.redisService.client.mGet(keys))
          .filter((_r) => _r)
          .reduce<{ [k: string]: ConnectedAppInstance[] }>((acc, _r) => {
            const parsedRecord: ConnectedAppInstance | undefined = _r
              ? JSON.parse(_r)
              : undefined
            if (!parsedRecord) {
              return acc
            }
            return {
              ...acc,
              [parsedRecord.appIdentifier]: (parsedRecord.appIdentifier in acc
                ? acc[parsedRecord.appIdentifier]
                : []
              ).concat([parsedRecord]),
            }
          }, {})
      : {}
  }
}
