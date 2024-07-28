import type { OnModuleInit } from '@nestjs/common'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { UserPushMessage } from '@stellariscloud/types'
import * as r from 'runtypes'
import { Namespace, Socket } from 'socket.io'

import { AccessTokenJWT, JWTService } from '../../auth/services/jwt.service'

const UserAuthPayload = r.Record({
  token: r.String,
})

@Injectable()
export class UserSocketService implements OnModuleInit {
  private readonly connectedClients: Map<string, Socket> = new Map()

  private namespace: Namespace
  setNamespace(namespace: Namespace) {
    this.namespace = namespace
  }

  constructor(private readonly jwtService: JWTService) {}

  async handleConnection(socket: Socket): Promise<void> {
    // console.log('UserSocketService handleConnection:', socket.nsp.name)

    const clientId = socket.id
    this.connectedClients.set(clientId, socket)
    socket.on('disconnect', () => {
      this.connectedClients.delete(clientId)
    })

    const auth = socket.handshake.auth
    if (UserAuthPayload.guard(auth)) {
      const token = auth.token
      if (typeof token !== 'string') {
        throw new UnauthorizedException()
      }
      try {
        const verifiedToken = AccessTokenJWT.parse(
          this.jwtService.verifyUserJWT(token),
        )
        if (verifiedToken.sub.startsWith('USER')) {
          const userId = verifiedToken.sub.split(':')[1]
          await socket.join(`user:${userId}`)
        } else {
          throw new UnauthorizedException()
        }
      } catch (e: any) {
        console.log('SOCKET ERROR:', e)
        socket.conn.close()
        // throw e
        throw e ?? new Error('Undefined error?')
      }
    } else {
      // auth payload does not match expected
      console.log('Bad auth payload.', auth)
      socket.disconnect(true)
      throw new UnauthorizedException()
    }
  }

  onModuleInit() {}

  sendToUserRoom(userId: string, name: UserPushMessage, msg: any) {
    this.namespace.to(`user:${userId}`).emit(name, msg)
  }
}
