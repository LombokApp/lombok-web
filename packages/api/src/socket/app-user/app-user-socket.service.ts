import type { ReceivedTaskUpdate } from '@lombokapp/types'
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

import { AppService } from '../../app/services/app.service'
import {
  AccessTokenJWT,
  APP_USER_JWT_SUB_PREFIX,
  JWTService,
} from '../../auth/services/jwt.service'
import { FolderService } from '../../folders/services/folder.service'
import { OrmService } from '../../orm/orm.service'
import { usersTable } from '../../users/entities/user.entity'

const AppUserAuthPayload = z.object({
  token: z.string(),
})

@Injectable()
export class AppUserSocketService {
  private readonly logger = new Logger(AppUserSocketService.name)
  private namespace: Namespace | undefined
  private readonly appService: AppService
  private readonly folderService: FolderService

  constructor(
    private readonly jwtService: JWTService,
    @Inject(forwardRef(() => AppService))
    _appService,
    @Inject(forwardRef(() => FolderService))
    _folderService,
    private readonly ormService: OrmService,
  ) {
    this.appService = _appService as AppService
    this.folderService = _folderService as FolderService
  }

  setNamespace(namespace: Namespace): void {
    this.namespace = namespace
  }

  async handleConnection(socket: Socket): Promise<void> {
    this.logger.debug(
      `AppUserSocketService handleConnection: [${socket.nsp.name}]`,
    )

    const auth = socket.handshake.auth
    if (safeZodParse(auth, AppUserAuthPayload)) {
      const token = auth.token
      try {
        const verifiedToken = AccessTokenJWT.parse(
          this.jwtService.verifyUserJWT(token),
        )
        if (verifiedToken.sub.startsWith(APP_USER_JWT_SUB_PREFIX)) {
          const userId = verifiedToken.sub.split(':')[1]
          ;(socket.data as Record<string, unknown>).userId = userId
          await socket.join(`user:${userId}`)
          this.logger.debug(
            `Socket authenticated userId: ${userId}, joined user:${userId} (socket: ${socket.id})`,
          )
        } else {
          throw new UnauthorizedException()
        }
      } catch (error: unknown) {
        this.logger.error('AppUser socket auth error:', error)
        socket.conn.close()
      }
    } else {
      this.logger.error('Bad auth payload:', auth)
      socket.disconnect(true)
      throw new UnauthorizedException()
    }
  }

  async subscribeFolderScope(
    socket: Socket,
    data: { folderId: string; appIdentifier: string },
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
      await this.appService.validateAppFolderAccess({
        appIdentifier: data.appIdentifier,
        folderId: data.folderId,
      })

      await socket.join(`folder:${data.folderId}`)
      this.logger.debug(
        `Socket subscribed to folder:${data.folderId} (socket: ${socket.id})`,
      )
    } catch (error: unknown) {
      this.logger.debug(
        `ACL validation failed for socket ${socket.id} subscribing to folder:${data.folderId}:`,
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
    await socket.leave(`folder:${data.folderId}`)
    this.logger.debug(
      `Socket unsubscribed from folder:${data.folderId} (socket: ${socket.id})`,
    )
  }

  emitAsyncUpdate(
    scope: {
      correlationKey: string | null
      source: string | null
      taskIdentifier: string | null
      targetUserId: string | null
      targetLocationFolderId: string | null
      targetLocationObjectKey: string | null
    },
    update: ReceivedTaskUpdate,
  ): void {
    if (!this.namespace) {
      this.logger.warn('Namespace not yet set when emitting async update.')
      return
    }

    const payload = { correlationKey: scope.correlationKey, ...update }

    const rooms: string[] = []
    if (scope.targetUserId) {
      rooms.push(`user:${scope.targetUserId}`)
    }
    if (scope.targetLocationFolderId) {
      rooms.push(`folder:${scope.targetLocationFolderId}`)
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
    emitter.emit('ASYNC_UPDATE', payload)
  }
}
