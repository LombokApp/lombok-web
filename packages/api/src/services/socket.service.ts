import { createAdapter } from '@socket.io/redis-adapter'
import type {
  ConnectedModuleInstancesMap,
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
  moduleId: r.String,
  name: r.String,
  token: r.String,
  eventSubscriptionKeys: r.Array(r.String),
})

const UserAuthPayload = r.Record({
  userId: r.String,
  token: r.String,
})

@singleton()
export class SocketService {
  moduleConnections: ConnectedModuleInstancesMap = {}
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
        void this.moduleService.getModule(auth.moduleId).then((module) => {
          if (!module) {
            client.disconnect()
            throw new UnauthorizedError()
            // TODO: represent error better for the socket client
          }

          // verifies the token using the publicKey we have on file for this module
          try {
            this.jwtService.verifyModuleJWT(module.publicKey, auth.token)
            const moduleConnections = (this.moduleConnections[auth.moduleId] =
              this.moduleConnections[auth.moduleId] ?? {})
            if (moduleConnections[auth.name]) {
              // worker still connected by that name
              client.disconnect()
              throw new UnauthorizedError()
            } else {
              // add the socket connection to a reference map of all modules
              moduleConnections[auth.name] = moduleConnections[auth.name] ?? {
                id: client.id,
                name: auth.name,
                ip: client.handshake.address,
              }
            }

            // register listener for requests from the module
            client.on('MODULE_API', async (message, ack) => {
              const response = await this.moduleService.handleModuleRequest(
                auth.name,
                auth.moduleId,
                message,
              )
              return ack(response)
            })

            client.on('disconnect', () => {
              // remove client in module reference map
              // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
              delete this.moduleConnections[client.id]
            })
            void Promise.all(
              auth.eventSubscriptionKeys.map((eventKey) => {
                const roomKey = `module:${auth.moduleId}__event:${eventKey}`
                return client.join(roomKey)
              }),
              // eslint-disable-next-line promise/no-nesting
            ).then(() => next())
          } catch (e) {
            if (
              e instanceof AuthTokenInvalidError ||
              e instanceof AuthTokenExpiredError
            ) {
              console.log('SOCKET AUTH ERROR [%s]:', e.name, e.message)
            }
            client.disconnect()
            throw new UnauthorizedError()
          }
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
        client.disconnect()
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

  getModuleConnections() {
    return this.moduleConnections
  }

  close() {
    this.userServer?.close()
  }
}
