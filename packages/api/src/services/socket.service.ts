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
import { FolderWorkerService } from '../domains/folder-operation/services/folder-worker.service'
import { UnauthorizedError } from '../errors/auth.error'

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

  constructor(private readonly jwtService: JWTService) {}

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
        } else if (verifiedToken.sub.startsWith('WORKER')) {
          // worker subscribe
          void this.workerService
            .getWorkerKey(scpParts[1])
            .then((workerKey) => socket.join(`workerKey:${workerKey.id}`))
            .catch(() => next(new UnauthorizedError()))
            .then(() => next())
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

  sendToFolderRoom(folderId: string, name: FolderPushMessage, msg: any) {
    this.ioServer?.to(`folder:${folderId}`).emit(name, msg)
  }
  close() {
    this.ioServer?.close()
  }
}
