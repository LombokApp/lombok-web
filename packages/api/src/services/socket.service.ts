import type { FolderPushMessage } from '@stellariscloud/types'
import type http from 'http'
import io from 'socket.io'
import { container, singleton } from 'tsyringe'

import { AuthTokenExpiredError } from '../domains/auth/errors/auth-token.error'
import { JWTService } from '../domains/auth/services/jwt.service'
import { FolderService } from '../domains/folder/services/folder.service'
import { UnauthorizedError } from '../errors/auth.error'

@singleton()
export class SocketService {
  ioServer?: io.Server

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
      let folderService
      try {
        folderService = container.resolve(FolderService)
      } catch (e) {
        next(new Error('Failure.'))
        return
      }
      const token = socket.handshake.query.token
      if (typeof token !== 'string') {
        next(new UnauthorizedError())
        return
      }
      try {
        const verifiedToken = this.jwtService.verifySocketAccessToken(token)
        if (!verifiedToken.folderId) {
          next(new UnauthorizedError())
          return
        }
        void folderService
          .getFolderAsUser({
            folderId: verifiedToken.folderId,
            userId: verifiedToken.jti.split(':')[0],
          })
          .then(({ folder }) => socket.join(`folder:${folder.id}`))
          .then(() => next())
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
