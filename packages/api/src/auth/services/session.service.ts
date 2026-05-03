import { JsonSerializableObject } from '@lombokapp/types'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import type { AccessTokenJWT } from 'src/auth/services/jwt.service'
import { JWTService } from 'src/auth/services/jwt.service'
import { OrmService } from 'src/orm/orm.service'
import type { User } from 'src/users/entities/user.entity'
import { v4 as uuidV4 } from 'uuid'

import type { NewSession, Session } from '../entities/session.entity'
import { sessionsTable } from '../entities/session.entity'
import { SessionExpiredException } from '../exceptions/session-expired.exception'
import { SessionInvalidException } from '../exceptions/session-invalid.exception'
import { SessionNotFoundException } from '../exceptions/session-not-found.exception'
import { hashedTokenHelper } from '../utils/hashed-token-helper'
import { sessionExpiresAt } from './auth.service'

@Injectable()
export class SessionService {
  constructor(
    private readonly jwtService: JWTService,
    private readonly ormService: OrmService,
  ) {}

  async createUserSession(user: User) {
    const secret = hashedTokenHelper.createSecretKey()

    const now = new Date()
    const newSession: NewSession = {
      id: uuidV4(),
      userId: user.id,
      hash: hashedTokenHelper.createHash(secret),
      type: 'user',
      expiresAt: sessionExpiresAt(now),
      createdAt: now,
      updatedAt: now,
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const session = (
      await this.ormService.db
        .insert(sessionsTable)
        .values(newSession)
        .returning()
    )[0]!

    const accessToken = await this.jwtService.createSessionAccessToken(session)
    const refreshToken = hashedTokenHelper.encode(session.id, secret)

    return {
      session,
      accessToken,
      refreshToken,
    }
  }

  async createAppUserSession(params: {
    user: User
    appIdentifier: string
    worker?: string
    platformAccess?: boolean
    extra?: JsonSerializableObject
    accessTokenExpiresInSec?: number
  }) {
    const { user, appIdentifier, worker, extra, accessTokenExpiresInSec } =
      params
    const platformAccess = JWTService.resolvePlatformAccess(params)
    const secret = hashedTokenHelper.createSecretKey()

    const now = new Date()
    const typeDetails: JsonSerializableObject = {
      app: appIdentifier,
      platformAccess,
      ...(worker !== undefined ? { worker } : {}),
      ...(extra ? { extra } : {}),
    }
    const newSession: NewSession = {
      id: uuidV4(),
      userId: user.id,
      hash: hashedTokenHelper.createHash(secret),
      type: 'app_user',
      typeDetails,
      expiresAt: sessionExpiresAt(now),
      createdAt: now,
      updatedAt: now,
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const session = (
      await this.ormService.db
        .insert(sessionsTable)
        .values(newSession)
        .returning()
    )[0]!

    const accessToken = await this.jwtService.createAppUserToken({
      session,
      appIdentifier,
      worker,
      platformAccess,
      extra,
      ...(accessTokenExpiresInSec !== undefined
        ? { accessTokenExpiresInSec }
        : {}),
    })
    const refreshToken = hashedTokenHelper.encode(session.id, secret)

    return {
      session,
      accessToken,
      refreshToken,
    }
  }

  async revokeSession(session: Session) {
    try {
      await this.delete(session)
    } catch (error) {
      if (!(error instanceof SessionNotFoundException)) {
        throw error
      }
    }
  }

  async getById(actor: User, id: string) {
    if (!actor.id) {
      throw new UnauthorizedException()
    }
    const session = await this.ormService.db.query.sessionsTable.findFirst({
      where: and(eq(sessionsTable.userId, actor.id), eq(sessionsTable.id, id)),
    })

    if (!session) {
      throw new SessionNotFoundException()
    }

    return session
  }

  async delete(session: Session) {
    await this.ormService.db
      .delete(sessionsTable)
      .where(eq(sessionsTable.id, session.id))
  }

  async verifySessionWithRefreshToken(refreshToken: string) {
    const [id, secret] = hashedTokenHelper.decodeRefreshToken(refreshToken)

    const session = await this.ormService.db.query.sessionsTable.findFirst({
      where: and(
        eq(sessionsTable.id, id),
        eq(sessionsTable.hash, hashedTokenHelper.createHash(secret)),
      ),
    })

    if (!session) {
      throw new SessionInvalidException()
    }

    if (Date.now() > new Date(session.expiresAt).getTime()) {
      throw new SessionExpiredException()
    }

    return session
  }

  async extendSession(session: Session) {
    if (Date.now() > new Date(session.expiresAt).getTime()) {
      throw new SessionExpiredException()
    }

    // Create a new secret
    const secret = hashedTokenHelper.createSecretKey()

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const updatedSession = (
      await this.ormService.db
        .update(sessionsTable)
        .set({
          expiresAt: sessionExpiresAt(new Date(session.createdAt)),
          hash: hashedTokenHelper.createHash(secret),
        })
        .where(eq(sessionsTable.id, session.id))
        .returning()
    )[0]!

    // Re-issue an access token of the same shape as the original session.
    const accessToken =
      updatedSession.type === 'app_user'
        ? await this.createAppUserAccessTokenForSession(updatedSession)
        : await this.jwtService.createSessionAccessToken(updatedSession)
    const refreshToken = hashedTokenHelper.encode(updatedSession.id, secret)

    return {
      session: updatedSession,
      accessToken,
      refreshToken,
    }
  }

  private async createAppUserAccessTokenForSession(
    session: Session,
  ): Promise<string> {
    const details = (session.typeDetails ?? {}) as {
      app?: unknown
      worker?: unknown
      platformAccess?: unknown
      extra?: unknown
    }
    if (typeof details.app !== 'string') {
      throw new SessionInvalidException()
    }
    return this.jwtService.createAppUserToken({
      session,
      appIdentifier: details.app,
      ...(typeof details.worker === 'string' ? { worker: details.worker } : {}),
      ...(typeof details.platformAccess === 'boolean'
        ? { platformAccess: details.platformAccess }
        : {}),
      ...(details.extra && typeof details.extra === 'object'
        ? { extra: details.extra as JsonSerializableObject }
        : {}),
    })
  }

  async verifySessionWithAccessToken(accessToken: AccessTokenJWT) {
    const returnedSessions = await this.ormService.db
      .select()
      .from(sessionsTable)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .where(eq(sessionsTable.id, accessToken.jti.split(':')[0]!))

    if (returnedSessions.length === 0) {
      throw new SessionInvalidException()
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const session = returnedSessions[0]!

    if (Date.now() > new Date(session.expiresAt).getTime()) {
      throw new SessionExpiredException()
    }

    return session
  }

  async listActiveUserSessions(user: User) {
    return this.ormService.db.query.sessionsTable.findMany({
      where: eq(sessionsTable.userId, user.id),
      orderBy: (sessions, { desc }) => [desc(sessions.createdAt)],
    })
  }
}
