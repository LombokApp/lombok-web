import type {
  FolderPushMessage,
  JsonSerializableObject,
  UserPushMessage,
} from '@lombokapp/types'
import { safeZodParse } from '@lombokapp/utils'
import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { eq } from 'drizzle-orm'
import type { Namespace, Socket } from 'socket.io'
import { z } from 'zod'

import {
  AccessTokenJWT,
  JWTService,
  USER_JWT_SUB_PREFIX,
} from '../../auth/services/jwt.service'
import { FolderService } from '../../folders/services/folder.service'
import { OrmService } from '../../orm/orm.service'
import { usersTable } from '../../users/entities/user.entity'

const UserAuthPayload = z.object({
  token: z.string(),
})

@Injectable()
export class UserSocketService {
  private readonly logger = new Logger(UserSocketService.name)
  private namespace: Namespace | undefined
  setNamespace(namespace: Namespace) {
    this.namespace = namespace
  }

  private readonly folderService: FolderService

  constructor(
    private readonly jwtService: JWTService,
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => FolderService))
    _folderService,
  ) {
    this.folderService = _folderService as FolderService
  }

  getUserRoomName(userId: string): string {
    return `user:${userId}`
  }

  getFolderRoomName(folderId: string): string {
    return `folder:${folderId}`
  }

  async handleConnection(socket: Socket): Promise<void> {
    this.logger.debug(
      `UserSocketService handleConnection: [${socket.nsp.name}]`,
    )

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
          if (!userId) {
            throw new UnauthorizedException()
          }
          ;(socket.data as Record<string, unknown>).userId = userId
          await socket.join(this.getUserRoomName(userId))
        } else {
          throw new UnauthorizedException()
        }
      } catch (error: unknown) {
        this.logger.error('Socket error:', error)
        socket.conn.close()
      }
    } else {
      // auth payload does not match expected
      this.logger.error('Bad auth payload:', auth)
      socket.disconnect(true)
      throw new UnauthorizedException()
    }
  }

  async subscribeFolderScope(
    socket: Socket,
    data: { folderId: string },
  ): Promise<void> {
    const userId = (socket.data as Record<string, unknown>).userId as
      | string
      | undefined
    if (!userId) {
      socket.emit('subscribe_error', {
        folderId: data.folderId,
        error: 'Not authenticated',
      })
      return
    }

    try {
      const user = await this.ormService.db.query.usersTable.findFirst({
        where: eq(usersTable.id, userId),
      })
      if (!user) {
        socket.emit('subscribe_error', {
          folderId: data.folderId,
          error: 'Access denied',
        })
        return
      }
      await this.folderService.getFolderAsUser(user, data.folderId)

      await socket.join(this.getFolderRoomName(data.folderId))
      this.logger.debug(
        `Socket subscribed to folder:${data.folderId} (socket: ${socket.id})`,
      )
    } catch (error: unknown) {
      this.logger.debug(
        `Folder ACL validation failed for socket ${socket.id} subscribing to folder:${data.folderId}:`,
        error,
      )
      socket.emit('subscribe_error', {
        folderId: data.folderId,
        error: 'Access denied',
      })
    }
  }

  async unsubscribeFolderScope(
    socket: Socket,
    data: { folderId: string },
  ): Promise<void> {
    await socket.leave(this.getFolderRoomName(data.folderId))
    this.logger.debug(
      `Socket unsubscribed from folder:${data.folderId} (socket: ${socket.id})`,
    )
  }

  sendToUserRoom(userId: string, name: UserPushMessage, msg: unknown) {
    if (this.namespace) {
      this.namespace.to(this.getUserRoomName(userId)).emit(name, msg)
    } else {
      this.logger.warn('Namespace not yet set when sending user room message.')
    }
  }

  sendToFolderRoom(folderId: string, name: FolderPushMessage, msg: unknown) {
    this.logger.debug(
      `UserSocketService.sendToFolderRoom folderId=${folderId} name=${name}`,
    )
    if (this.namespace) {
      this.namespace.to(this.getFolderRoomName(folderId)).emit(name, msg)
    } else {
      this.logger.warn(
        'Namespace not yet set when sending folder room message.',
      )
    }
  }

  emitUpdate({
    update,
    scope,
  }: {
    update: {
      code: string
      data: JsonSerializableObject
    }
    scope: {
      targetUserId: string
      targetLocationFolderId: string | null
    }
  }): void {
    if (!this.namespace) {
      this.logger.warn('Namespace not yet set when emitting update.')
      return
    }

    const rooms: string[] = []
    if (scope.targetUserId) {
      rooms.push(this.getUserRoomName(scope.targetUserId))
    }
    if (scope.targetLocationFolderId) {
      rooms.push(this.getFolderRoomName(scope.targetLocationFolderId))
    }

    if (rooms.length === 0) {
      this.logger.debug(
        'emitAsyncUpdate called with no target rooms, skipping emit.',
      )
      return
    }

    // Chain .to() calls so socket.io deduplicates if a socket is in multiple rooms
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    let emitter = this.namespace.to(rooms[0]!)
    for (let i = 1; i < rooms.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      emitter = emitter.to(rooms[i]!)
    }
    emitter.emit(update.code, update.data)
  }
}
