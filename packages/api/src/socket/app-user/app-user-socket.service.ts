import type { JsonSerializableObject } from '@lombokapp/types'
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
import { JWTService } from '../../auth/services/jwt.service'
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

  getUserRoomName(appIdentifier: string, userId: string): string {
    return `app:${appIdentifier}__user:${userId}`
  }

  getFolderRoomName(
    appIdentifier: string,
    userId: string,
    folderId: string,
  ): string {
    return `app:${appIdentifier}__user:${userId}__folder:${folderId}`
  }

  async authenticateAndJoin(socket: Socket): Promise<void> {
    const auth = socket.handshake.auth
    if (!safeZodParse(auth, AppUserAuthPayload)) {
      throw new UnauthorizedException('Bad auth payload')
    }
    const claims = await this.jwtService.verifyAppToken(auth.token)
    if (claims.actorType !== 'app_user' || claims.worker !== undefined) {
      throw new UnauthorizedException()
    }
    const { userId, appIdentifier } = claims
    ;(socket.data as Record<string, unknown>).userId = userId
    ;(socket.data as Record<string, unknown>).appIdentifier = appIdentifier
    await socket.join(this.getUserRoomName(appIdentifier, userId))
    this.logger.debug(
      `Socket authenticated userId: ${userId}, joined ${this.getUserRoomName(appIdentifier, userId)} (socket: ${socket.id})`,
    )
  }

  async subscribeFolderScope(
    socket: Socket,
    data: { folderId: string },
  ): Promise<void> {
    const { userId, appIdentifier } = socket.data as Record<string, string>
    if (!userId || !appIdentifier) {
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
        appIdentifier,
        folderId: data.folderId,
      })

      await socket.join(
        this.getFolderRoomName(appIdentifier, userId, data.folderId),
      )
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
    const { userId, appIdentifier } = socket.data as Record<string, string>
    if (!userId || !appIdentifier) {
      socket.emit('unsubscribe_error', {
        folderId: data.folderId,
        error: 'Not authenticated',
      })
      return
    }

    await socket.leave(
      this.getFolderRoomName(appIdentifier, userId, data.folderId),
    )
    this.logger.debug(
      `Socket unsubscribed from folder:${data.folderId} (socket: ${socket.id})`,
    )
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
      targetAppIdentifier: string
      targetLocationFolderId: string | null
    }
  }): void {
    if (!this.namespace) {
      this.logger.warn('Namespace not yet set when emitting update.')
      return
    }

    const rooms: string[] = []
    if (scope.targetUserId) {
      rooms.push(
        this.getUserRoomName(scope.targetAppIdentifier, scope.targetUserId),
      )
    }
    if (scope.targetLocationFolderId) {
      rooms.push(
        this.getFolderRoomName(
          scope.targetAppIdentifier,
          scope.targetUserId,
          scope.targetLocationFolderId,
        ),
      )
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
