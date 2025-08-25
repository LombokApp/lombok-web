import { FolderPushMessage } from '@lombokapp/types'
import { safeZodParse } from '@lombokapp/utils'
import type { OnModuleInit } from '@nestjs/common'
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { Namespace, Socket } from 'socket.io'
import { FolderService } from 'src/folders/services/folder.service'
import { UserService } from 'src/users/services/users.service'
import { z } from 'zod'

import {
  AccessTokenJWT,
  JWTService,
  USER_JWT_SUB_PREFIX,
} from '../../auth/services/jwt.service'

const UserAuthPayload = z.object({
  token: z.string(),
  folderId: z.string(),
})

@Injectable()
export class FolderSocketService implements OnModuleInit {
  private readonly logger = new Logger(FolderSocketService.name)
  private readonly connectedClients = new Map<string, Socket>()
  private namespace: Namespace | undefined
  setNamespace(namespace: Namespace) {
    this.namespace = namespace
  }
  private readonly folderService: FolderService

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly jwtService: JWTService,
    private readonly userService: UserService,
  ) {
    this.folderService = this.moduleRef.get(FolderService)
  }

  async handleConnection(socket: Socket): Promise<void> {
    // const folderId = socket.nsp.name.slice('/folders/'.length)
    // console.log('FolderSocketService handleConnection:', folderId)

    const clientId = socket.id
    this.connectedClients.set(clientId, socket)
    socket.on('disconnect', () => {
      this.logger.debug(`Socket disconnect: ${socket.id}`)
      this.connectedClients.delete(clientId)
    })

    // Handle other events and messages from the client
    const auth = socket.handshake.auth
    // console.log('folder socket auth:', auth)
    if (safeZodParse(auth, UserAuthPayload)) {
      const folderId = auth.folderId
      const token = auth.token
      if (typeof token !== 'string') {
        throw new UnauthorizedException()
      }
      try {
        const verifiedToken = AccessTokenJWT.parse(
          this.jwtService.verifyUserJWT(token),
        )

        if (verifiedToken.sub.startsWith(USER_JWT_SUB_PREFIX)) {
          // folder event subscribe
          const userId = verifiedToken.sub.split(':')[1]
          const user = await this.userService.getUserById({ id: userId })
          const roomId = `folder:${folderId}`

          await this.folderService.getFolderAsUser(user, folderId).then(() => {
            this.logger.debug(`Adding socket to folder room: ${roomId}`)
            return socket.join(roomId)
          })
        } else {
          throw new UnauthorizedException()
        }
      } catch (e: unknown) {
        // eslint-disable-next-line no-console
        console.log('SOCKET ERROR:', e)
        socket.conn.close()
      }
    } else {
      // auth payload does not match expected
      // eslint-disable-next-line no-console
      console.log('Bad auth payload.', auth)
      socket.disconnect(true)
      throw new UnauthorizedException()
    }
  }

  getRoomId(folderId: string) {
    return `folder:${folderId}`
  }

  getNamespace(folderId: string) {
    return `/folders/${folderId}`
  }

  onModuleInit() {
    // this.folderService = this.moduleRef.get(FolderService)
  }

  sendToFolderRoom(folderId: string, name: FolderPushMessage, msg: unknown) {
    this.logger.debug('sendToFolderRoom:', { folderId, name, msg })

    if (this.namespace) {
      this.namespace.to(this.getRoomId(folderId)).emit(name, msg)
    } else {
      // eslint-disable-next-line no-console
      console.log('Namespace not yet set when sending folder room message.')
    }
  }
}
