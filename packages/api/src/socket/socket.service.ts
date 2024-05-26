import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { createAdapter } from '@socket.io/redis-adapter'
import type {
  ConnectedAppInstance,
  FolderPushMessage,
} from '@stellariscloud/types'
import type http from 'http'
import * as r from 'runtypes'
import * as io from 'socket.io'
import { AppService } from 'src/app/services/app.service'
import { RedisService } from 'src/cache/redis.service'
import { FolderService } from 'src/folders/services/folder.service'

import { AccessTokenJWT, JWTService } from '../auth/services/jwt.service'

const ModuleAuthPayload = r.Record({
  appWorkerId: r.String,
  token: r.String,
  eventSubscriptionKeys: r.Array(r.String),
})

const UserAuthPayload = r.Record({
  userId: r.String,
  token: r.String,
})

@Injectable()
export class SocketService implements OnModuleInit, OnModuleDestroy {
  userServer?: io.Server
  appServer?: io.Server
  private appService: AppService
  private folderService: FolderService

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly jwtService: JWTService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit() {
    this.appService = this.moduleRef.get(AppService)
    this.folderService = this.moduleRef.get(FolderService)
  }

  initAppServer(server: http.Server) {
    if (this.appServer) {
      throw new Error('App socket server is already initialised.')
    }

    console.log('Setting up app connection socket.')

    this.appServer = new io.Server(server, {
      cors: {
        origin: '*', // TODO: constrain this
        allowedHeaders: [],
      },
    })

    this.appServer.adapter(
      createAdapter(
        this.redisService.client,
        this.redisService.client.duplicate(),
      ),
    )

    this.appServer.use((client, next) => {
      const auth = client.handshake.auth
      if (ModuleAuthPayload.guard(auth)) {
        const jwt = this.jwtService.decodeJWT(auth.token)
        const sub = jwt.payload.sub as string | undefined
        const appIdentifier = sub?.startsWith('APP:')
          ? sub.slice('APP:'.length)
          : undefined

        if (!appIdentifier) {
          console.log('No app identifier in jwt')
          client.disconnect(true)
          next(new UnauthorizedException())
          return
        }
        void this.appService.getApp(appIdentifier).then((app) => {
          if (!app) {
            console.log(
              'App "%s" not recognised. Disconnecting...',
              appIdentifier,
            )
            client.disconnect(true)
            next(new UnauthorizedException())
            return
          }

          try {
            // verifies the token using the publicKey we have on file for this app
            const _verifiedJwt = this.jwtService.verifyAppJWT(
              appIdentifier,
              app.publicKey,
              auth.token,
            )
            // console.log('verifiedJwt:', _verifiedJwt)
          } catch (e: any) {
            console.log('SOCKET JWT VERIFY ERROR:', e)
            client.disconnect(true)
            next(new UnauthorizedException())
            return
          }

          // persist worker state to redis
          const workerRedisStateKey = `APP_WORKER:${appIdentifier}:${auth.appWorkerId}`
          void this.redisService.client.SET(
            workerRedisStateKey,
            JSON.stringify({
              appIdentifier,
              socketClientId: client.id,
              name: auth.appWorkerId,
              ip: client.handshake.address,
            }),
          )

          // register listener for requests from the app
          client.on('APP_API', async (message, ack) => {
            const response = await this.appService.handleAppRequest(
              auth.appWorkerId,
              appIdentifier,
              message,
            )
            return ack(response)
          })

          client.on('disconnect', () => {
            // remove client state from redis
            console.log('Removing worker state from redis...')
            void this.redisService.client.del(workerRedisStateKey)
          })

          // add the clients to the rooms corresponding to their subscriptions
          void Promise.all(
            auth.eventSubscriptionKeys.map((eventKey) => {
              const roomKey = `app:${appIdentifier}__event:${eventKey}`
              return client.join(roomKey)
            }),
            // eslint-disable-next-line promise/no-nesting
          ).then(() => next())
        })
      } else if (UserAuthPayload.guard(auth)) {
        const token = auth.token
        if (typeof token !== 'string') {
          next(new UnauthorizedException())
          return
        }
        try {
          const verifiedToken = AccessTokenJWT.parse(
            this.jwtService.verifyJWT(token),
          )
          const scpParts = verifiedToken.scp[0]?.split(':') ?? []
          if (scpParts[0] !== 'socket_connect') {
            next(new UnauthorizedException())
            return
          }

          if (verifiedToken.sub.startsWith('USER') && scpParts[1]) {
            // folder event subscribe
            void this.folderService
              .getFolderAsUser({
                folderId: scpParts[1],
                userId: verifiedToken.jti.split(':')[0],
              })
              .then(({ folder }) => client.join(`folder:${folder.id}`))
              .then(() => next())
          } else {
            next(new UnauthorizedException())
          }
        } catch (e: any) {
          client.conn.close()
          next(e as Error)
        }
      } else {
        // auth payload does not match expected
        console.log('Bad auth payload.', auth)
        client.disconnect(true)
        next(new UnauthorizedException())
      }
    })

    this.appServer.on('message', (msg, client) => {
      console.log("client 'message':", msg, client)
    })

    this.appServer.on('open', (client) => {
      console.log("client: 'open'", client)
    })
  }

  init(server: http.Server) {
    this.initAppServer(server)
  }

  sendToFolderRoom(folderId: string, name: FolderPushMessage, msg: any) {
    this.userServer?.to(`folder:${folderId}`).emit(name, msg)
  }

  notifyAppWorkersOfPendingEvents(
    appId: string,
    eventKey: string,
    count: number,
  ) {
    const roomKey = `app:${appId}__event:${eventKey}`
    this.appServer
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

  close() {
    this.userServer?.close()
  }

  onModuleDestroy() {
    this.close()
  }
}
