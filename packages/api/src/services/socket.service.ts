import { createAdapter } from '@socket.io/redis-adapter'
import type { FolderPushMessage } from '@stellariscloud/types'
import type http from 'http'
import io from 'socket.io'
import { container, singleton } from 'tsyringe'

import { AuthTokenExpiredError } from '../domains/auth/errors/auth-token.error'
import {
  AccessTokenJWT,
  JWTService,
} from '../domains/auth/services/jwt.service'
import { FolderService } from '../domains/folder/services/folder.service'
import type { FolderOperation } from '../domains/folder-operation/entities/folder-operation.entity'
import { FolderWorkerInvalidError } from '../domains/folder-operation/errors/folder-worker-key.error'
import { FolderWorkerService } from '../domains/folder-operation/services/folder-worker.service'
import { UnauthorizedError } from '../errors/auth.error'
import { RedisService } from './redis.service'

@singleton()
export class SocketService {
  ioServer?: io.Server
  _folderService?: FolderService
  _folderWorkerService?: FolderWorkerService

  get folderService() {
    if (!this._folderService) {
      this._folderService = container.resolve(FolderService)
    }
    return this._folderService
  }

  get workerService() {
    if (!this._folderWorkerService) {
      this._folderWorkerService = container.resolve(FolderWorkerService)
    }
    return this._folderWorkerService
  }

  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JWTService,
  ) {}

  init(server: http.Server) {
    if (this.ioServer) {
      throw new Error('Socket server is already initialised.')
    }
    this.ioServer = new io.Server(server, {
      cors: {
        origin: '*', // TODO: constrain this
        allowedHeaders: [],
      },
    })

    this.ioServer.adapter(
      createAdapter(
        this.redisService.client,
        this.redisService.client.duplicate(),
      ),
    )

    this.ioServer.use((socket, next) => {
      const token = socket.handshake.query.token
      if (typeof token !== 'string') {
        next(new UnauthorizedError())
        return
      }
      try {
        const verifiedToken = AccessTokenJWT.parse(
          this.jwtService.verifyJWT(token),
        )
        const scpParts = verifiedToken.scp[0]?.split(':') ?? []
        const subParts = verifiedToken.sub.split(':')
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
            .then(({ folder }) => socket.join(`folder:${folder.id}`))
            .then(() => next())
        } else if (subParts[0] === 'WORKER') {
          // worker subscribe
          const workerKeyId = subParts[1]
          const externalId = socket.handshake.query.externalId
          const capabilities = socket.handshake.query.capabilities
          if (
            typeof externalId !== 'string' ||
            typeof capabilities !== 'string'
          ) {
            throw new FolderWorkerInvalidError()
          }

          void this.workerService
            .getWorkerKey(workerKeyId)
            .then(async (workerKey) => {
              const worker = await this.workerService.upsertFolderWorker(
                workerKey,
                externalId,
                capabilities.split(','),
                socket.handshake.address,
              )
              if (!workerKey.ownerId) {
                const folderWorkerKey = `folderWorker:${worker.id}`
                await socket.join(folderWorkerKey)
                await this.redisService.client.set(
                  folderWorkerKey,
                  JSON.stringify({
                    connectedAt: Date.now(),
                    capabilities:
                      typeof capabilities === 'string'
                        ? [capabilities]
                        : capabilities,
                  }),
                )
                socket.on('close', () => {
                  console.log('Worker [%s] socket closed', worker.id)
                  void this.redisService.client.del(folderWorkerKey)
                })
              } else {
                // TODO: implement user worker logic
              }
              next()
            })
            .catch((_e) => {
              console.log('ERROR:', _e)
              next(new UnauthorizedError())
            })
        } else {
          next(new UnauthorizedError())
        }
      } catch (e: any) {
        if (e instanceof AuthTokenExpiredError) {
          socket.conn.close()
        }
        next(e as Error)
      }
    })
  }

  async sendFolderOperationToWorker(folderOperation: FolderOperation) {
    const capabilitiesToWorkersMap: { [key: string]: string[] | undefined } = {}
    const folderWorkerRedisKeys = await this.redisService.client.keys(
      `folderWorker:*`,
    )

    // create map of workers by their capabilities
    for (const folderWorkerRedisKey of folderWorkerRedisKeys) {
      const keyValue = JSON.parse(
        (await this.redisService.client.get(folderWorkerRedisKey)) ?? '',
      )
      if (!keyValue) {
        continue
      }
      for (const capability of keyValue.capabilities) {
        capabilitiesToWorkersMap[capability] =
          capabilitiesToWorkersMap[capability] ?? []
        capabilitiesToWorkersMap[capability]?.push(folderWorkerRedisKey)
      }
    }

    for (const folderWorkerRedisKey of capabilitiesToWorkersMap[
      folderOperation.operationName
    ] ?? []) {
      const clientIds = Array.from(
        this.ioServer?.sockets.adapter.rooms.get(folderWorkerRedisKey) ?? [],
      )
      const clientSocket = this.ioServer?.sockets.sockets.get(clientIds[0])
      if (!clientSocket) {
        continue
      }
      const response: { willComplete: boolean } = await clientSocket
        .timeout(250)
        .emitWithAck('WORK_REQUEST', {
          messageType: 'CHECK_AVAILABILITY',
          task: {
            id: folderOperation.id,
            name: folderOperation.operationName,
            data: folderOperation.operationData,
          },
        })
        .catch(() => ({
          willComplete: false,
        }))

      if (response.willComplete) {
        // return the folder worker ID so it can be recorded as the assignee of this operation
        return folderWorkerRedisKey.split(':')[1]
      }
    }
  }

  sendToFolderRoom(folderId: string, name: FolderPushMessage, msg: any) {
    this.ioServer?.to(`folder:${folderId}`).emit(name, msg)
  }

  close() {
    this.ioServer?.close()
  }
}
