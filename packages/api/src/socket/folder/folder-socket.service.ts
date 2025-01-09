import type { OnModuleInit } from '@nestjs/common'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { FolderPushMessage } from '@stellariscloud/types'
import * as r from 'runtypes'
import { Namespace, Socket } from 'socket.io'
import { FolderService } from 'src/folders/services/folder.service'
import { UserService } from 'src/users/services/users.service'

import { AccessTokenJWT, JWTService } from '../../auth/services/jwt.service'

const UserAuthPayload = r.Record({
  token: r.String,
  folderId: r.String,
})

@Injectable()
export class FolderSocketService implements OnModuleInit {
  private readonly connectedClients: Map<string, Socket> = new Map()
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
      this.connectedClients.delete(clientId)
    })

    // Handle other events and messages from the client
    const auth = socket.handshake.auth
    // console.log('folder socket auth:', auth)
    if (UserAuthPayload.guard(auth)) {
      const folderId = auth.folderId
      const token = auth.token
      if (typeof token !== 'string') {
        throw new UnauthorizedException()
      }
      try {
        const verifiedToken = AccessTokenJWT.parse(
          this.jwtService.verifyUserJWT(token),
        )
        // console.log('verifiedToken:', verifiedToken)

        if (verifiedToken.sub.startsWith('USER')) {
          // folder event subscribe
          const userId = verifiedToken.sub.split(':')[1]
          const user = await this.userService.getUserById({ id: userId })
          await this.folderService
            .getFolderAsUser(user, folderId)
            .then(({ folder }) => socket.join(`folder:${folder.id}`))
        } else {
          throw new UnauthorizedException()
        }
      } catch (e: unknown) {
        console.log('SOCKET ERROR:', e)
        socket.conn.close()
      }
    } else {
      // auth payload does not match expected
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
    // console.log('sendToFolderRoom:', { folderId, name, msg })
    // this.server?.to(this.getRoomId(folderId)).emit(name, msg)
    // console.log(
    //   'folderSocketGateway:',
    //   this.folderSocketGateway.namespace.server,
    // )

    if (this.namespace) {
      this.namespace.to(this.getRoomId(folderId)).emit(name, msg)
    } else {
      console.log('Namespace not yet set when sending folder room message.')
    }
  }
}
