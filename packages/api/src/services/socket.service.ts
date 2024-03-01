import { createAdapter } from '@socket.io/redis-adapter'
import type {
  ConnectedModuleInstance,
  FolderPushMessage,
} from '@stellariscloud/types'
import type http from 'http'
import * as r from 'runtypes'
import io from 'socket.io'
import { container, singleton } from 'tsyringe'

import {
  AuthTokenExpiredError,
  AuthTokenInvalidError,
} from '../domains/auth/errors/auth-token.error'
import {
  AccessTokenJWT,
  JWTService,
} from '../domains/auth/services/jwt.service'
import { FolderService } from '../domains/folder/services/folder.service'
import { ModuleService } from '../domains/module/services/module.service'
import { UnauthorizedError } from '../errors/auth.error'
import { RedisService } from './redis.service'

const ModuleAuthPayload = r.Record({
  moduleWorkerId: r.String,
  token: r.String,
  eventSubscriptionKeys: r.Array(r.String),
})

const UserAuthPayload = r.Record({
  userId: r.String,
  token: r.String,
})

@singleton()
export class SocketService {
  userServer?: io.Server
  moduleServer?: io.Server
  _folderService?: FolderService
  _moduleService?: ModuleService

  get folderService() {
    if (!this._folderService) {
      this._folderService = container.resolve(FolderService)
    }
    return this._folderService
  }

  get moduleService() {
    if (!this._moduleService) {
      this._moduleService = container.resolve(ModuleService)
    }
    return this._moduleService
  }

  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JWTService,
  ) {}

  initModuleServer(server: http.Server) {
    if (this.moduleServer) {
      throw new Error('Module socket server is already initialised.')
    }

    console.log('Setting up module socket.')

    this.moduleServer = new io.Server(server, {
      cors: {
        origin: '*', // TODO: constrain this
        allowedHeaders: [],
      },
    })

    this.moduleServer.adapter(
      createAdapter(
        this.redisService.client,
        this.redisService.client.duplicate(),
      ),
    )

    this.moduleServer.use((client, next) => {
      const auth = client.handshake.auth
      if (ModuleAuthPayload.guard(auth)) {
        const jwt = this.jwtService.decodeModuleJWT(auth.token)
        const sub = jwt?.payload.sub as string | undefined
        const moduleIdentifier = sub?.startsWith('MODULE:')
          ? sub.slice('MODULE:'.length)
          : undefined

        if (!moduleIdentifier) {
          console.log('No module identifier in jwt')
          client.disconnect(true)
          next(new UnauthorizedError())
          return
        }
        void this.moduleService.getModule(moduleIdentifier).then((module) => {
          if (!module) {
            console.log(
              'Module "%s" not recognised. Disconnecting...',
              moduleIdentifier,
            )
            client.disconnect(true)
            next(new UnauthorizedError())
            return
          }

          try {
            // verifies the token using the publicKey we have on file for this module
            const _verifiedJwt = this.jwtService.verifyModuleJWT(
              moduleIdentifier,
              module.publicKey,
              auth.token,
            )
            // console.log('verifiedJwt:', _verifiedJwt)
          } catch (e: any) {
            if (
              e instanceof AuthTokenInvalidError ||
              e instanceof AuthTokenExpiredError
            ) {
              console.log('SOCKET AUTH ERROR [%s]:', e.name)
            } else {
              console.log('SOCKET ERROR [%s]:', e.name)
            }
            client.disconnect(true)
            next(new UnauthorizedError())
            return
          }

          // persist worker state to redis
          const workerRedisStateKey = `MODULE_WORKER:${moduleIdentifier}:${auth.moduleWorkerId}`
          void this.redisService.client.SET(
            workerRedisStateKey,
            JSON.stringify({
              moduleIdentifier,
              socketClientId: client.id,
              name: auth.moduleWorkerId,
              ip: client.handshake.address,
            }),
          )

          // register listener for requests from the module
          client.on('MODULE_API', async (message, ack) => {
            const response = await this.moduleService.handleModuleRequest(
              auth.moduleWorkerId,
              moduleIdentifier,
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
              const roomKey = `module:${moduleIdentifier}__event:${eventKey}`
              return client.join(roomKey)
            }),
            // eslint-disable-next-line promise/no-nesting
          ).then(() => next())
        })
      } else if (UserAuthPayload.guard(auth)) {
        const token = auth.token
        if (typeof token !== 'string') {
          next(new UnauthorizedError())
          return
        }
        try {
          const verifiedToken = AccessTokenJWT.parse(
            this.jwtService.verifyJWT(token),
          )
          const scpParts = verifiedToken.scp[0]?.split(':') ?? []
          if (scpParts[0] !== 'socket_connect') {
            next(new UnauthorizedError())
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
            next(new UnauthorizedError())
          }
        } catch (e: any) {
          if (e instanceof AuthTokenExpiredError) {
            client.conn.close()
          }
          next(e as Error)
        }
      } else {
        // auth payload does not match expected
        console.log('Bad auth payload.', auth)
        client.disconnect(true)
        next(new UnauthorizedError())
      }
    })

    this.moduleServer.on('message', (msg, client) => {
      console.log("client 'message':", msg, client)
    })

    this.moduleServer.on('open', (client) => {
      console.log("client: 'open'", client)
    })
  }

  init(server: http.Server) {
    this.initModuleServer(server)
  }

  sendToFolderRoom(folderId: string, name: FolderPushMessage, msg: any) {
    this.userServer?.to(`folder:${folderId}`).emit(name, msg)
  }

  notifyModuleWorkersOfPendingEvents(
    moduleId: string,
    eventKey: string,
    count: number,
  ) {
    const roomKey = `module:${moduleId}__event:${eventKey}`
    this.moduleServer
      ?.to(roomKey)
      .emit('PENDING_EVENTS_NOTIFICATION', { eventKey, count })
  }

  async getModuleConnections(): Promise<{
    [key: string]: ConnectedModuleInstance[]
  }> {
    let cursor = 0
    let started = false
    let keys: string[] = []
    while (!started || cursor !== 0) {
      started = true
      const scanResult = await this.redisService.client.scan(cursor, {
        MATCH: 'MODULE_WORKER:*',
        TYPE: 'string',
        COUNT: 10000,
      })
      keys = keys.concat(scanResult.keys)
      cursor = scanResult.cursor
    }

    return keys.length
      ? (await this.redisService.client.mGet(keys))
          .filter((_r) => _r)
          .reduce<{ [k: string]: ConnectedModuleInstance[] }>((acc, _r) => {
            const parsedRecord: ConnectedModuleInstance | undefined = _r
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
}
