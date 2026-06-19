import type { RealtimeEnvelope, RealtimeScope } from '@lombokapp/types'
import { REALTIME_EVENT } from '@lombokapp/types'
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

  getServerRoomName(): string {
    return 'server'
  }

  /**
   * Authenticate (JWT + DB `isAdmin` re-read) and stamp `socket.data`. Registered
   * as connection middleware (see the gateway); room joins stay in handleConnection
   * because joining from middleware isn't durable.
   */
  async authenticateSocket(socket: Socket): Promise<void> {
    const auth = socket.handshake.auth
    if (!safeZodParse(auth, UserAuthPayload)) {
      throw new UnauthorizedException()
    }
    const verifiedToken = AccessTokenJWT.parse(
      await this.jwtService.verifyUserJWT(auth.token),
    )
    if (!verifiedToken.sub.startsWith(USER_JWT_SUB_PREFIX)) {
      throw new UnauthorizedException()
    }
    const userId = verifiedToken.sub.split(':')[1]
    if (!userId) {
      throw new UnauthorizedException()
    }
    // Same source of truth the AuthGuard uses: re-read isAdmin from the DB rather
    // than trusting the JWT (admin can be revoked mid-session).
    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
      columns: { id: true, isAdmin: true },
    })
    if (!user) {
      throw new UnauthorizedException()
    }
    ;(socket.data as Record<string, unknown>).userId = userId
    ;(socket.data as Record<string, unknown>).isAdmin = user.isAdmin
  }

  async handleConnection(socket: Socket): Promise<void> {
    this.logger.debug(
      `UserSocketService handleConnection: [${socket.nsp.name}]`,
    )
    const data = socket.data as Record<string, unknown>
    const userId = data.userId as string | undefined
    if (!userId) {
      socket.disconnect(true)
      return
    }
    await socket.join(this.getUserRoomName(userId))
    if (data.isAdmin) {
      await socket.join(this.getServerRoomName())
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
      // getFolderAsUser resolves ownership/shares from actor.id alone, so the
      // userId verified at connect is enough — no need to re-fetch the user row.
      // A since-deleted user owns nothing and has no shares → access denied.
      await this.folderService.getFolderAsUser({ id: userId }, data.folderId)

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

  /** Resolve an envelope's scope to its room and emit it under the single REALTIME_EVENT name. */
  emitEnvelope(envelope: RealtimeEnvelope): void {
    if (!this.namespace) {
      this.logger.warn('Namespace not yet set when emitting realtime envelope.')
      return
    }
    const room = this.scopeToRoom(envelope.scope)
    this.namespace.to(room).emit(REALTIME_EVENT, envelope)
  }

  /** Emit to every connected user socket. Narrow use only: non-sensitive "refetch" nudges. */
  broadcastEnvelope(envelope: RealtimeEnvelope): void {
    if (!this.namespace) {
      this.logger.warn(
        'Namespace not yet set when broadcasting realtime envelope.',
      )
      return
    }
    this.namespace.emit(REALTIME_EVENT, envelope)
  }

  private scopeToRoom(scope: RealtimeScope): string {
    switch (scope.kind) {
      case 'user':
        return this.getUserRoomName(scope.userId)
      case 'folder':
        return this.getFolderRoomName(scope.folderId)
      case 'server':
        return this.getServerRoomName()
    }
  }
}
