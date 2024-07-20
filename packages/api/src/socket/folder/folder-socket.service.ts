import type { OnModuleInit } from '@nestjs/common'
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { ModuleRef } from '@nestjs/core'
import { createAdapter } from '@socket.io/redis-adapter'
import { FolderPushMessage } from '@stellariscloud/types'
import * as r from 'runtypes'
import { Server, Socket } from 'socket.io'
import { redisConfig } from 'src/cache/redis.config'
import { RedisService } from 'src/cache/redis.service'
import { FolderService } from 'src/folders/services/folder.service'

import { AccessTokenJWT, JWTService } from '../../auth/services/jwt.service'

const UserAuthPayload = r.Record({
  userId: r.String,
  token: r.String,
})

@Injectable()
export class FolderSocketService implements OnModuleInit {
  private readonly connectedClients: Map<string, Socket> = new Map()
  private folderService: FolderService
  private server?: Server

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly jwtService: JWTService,
    private readonly redisService: RedisService,
    @Inject(redisConfig.KEY)
    private readonly _redisConfig: nestjsConfig.ConfigType<typeof redisConfig>,
  ) {}

  setServer(server: Server) {
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
    const folderId = socket.nsp.name.slice('/folders/'.length)
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
          await this.folderService
            .getFolderAsUser({
              folderId,
              userId: verifiedToken.sub.split(':')[1],
            })
            .then(({ folder }) => socket.join(`folder:${folder.id}`))
        } else {
          throw new UnauthorizedException()
        }
      } catch (e: any) {
        console.log('SOCKET ERROR:', e)
        socket.conn.close()
        throw e ?? new Error('Undefined Error.')
      }
    } else {
      // auth payload does not match expected
      console.log('Bad auth payload.', auth)
      socket.disconnect(true)
      throw new UnauthorizedException()
    }
  }

  onModuleInit() {
    this.folderService = this.moduleRef.get(FolderService)
  }

  sendToFolderRoom(folderId: string, name: FolderPushMessage, msg: any) {
    this.server?.to(`folder:${folderId}`).emit(name, msg)
  }
}
