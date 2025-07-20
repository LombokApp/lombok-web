import { Injectable, UnauthorizedException } from '@nestjs/common'
import type { UserPushMessage } from '@stellariscloud/types'
import { safeZodParse } from '@stellariscloud/utils'
import type { Namespace, Socket } from 'socket.io'
import { z } from 'zod'

import {
  AccessTokenJWT,
  JWTService,
  USER_JWT_SUB_PREFIX,
} from '../../auth/services/jwt.service'

const UserAuthPayload = z.object({
  token: z.string(),
})

@Injectable()
export class UserSocketService {
  private readonly connectedClients = new Map<string, Socket>()

  private namespace: Namespace | undefined
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
    if (safeZodParse(auth, UserAuthPayload)) {
      const token = auth.token
      if (typeof token !== 'string') {
        throw new UnauthorizedException()
      }
      try {
        const verifiedToken = AccessTokenJWT.parse(
          this.jwtService.verifyUserJWT(token),
        )
        if (verifiedToken.sub.startsWith(USER_JWT_SUB_PREFIX)) {
          const userId = verifiedToken.sub.split(':')[1]
          await socket.join(`user:${userId}`)
        } else {
          throw new UnauthorizedException()
        }
      } catch (error: unknown) {
        // eslint-disable-next-line no-console
        console.log('SOCKET ERROR:', error)
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

  sendToUserRoom(userId: string, name: UserPushMessage, msg: unknown) {
    if (this.namespace) {
      this.namespace.to(`user:${userId}`).emit(name, msg)
    } else {
      // eslint-disable-next-line no-console
      console.log('Namespace not yet set when sending user room message.')
    }
  }
}
