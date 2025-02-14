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

  async createSession(user: User) {
    const secret = hashedTokenHelper.createSecretKey()

    const now = new Date()
    const newSession: NewSession = {
      id: uuidV4(),
      userId: user.id,
      hash: hashedTokenHelper.createHash(secret),
      expiresAt: sessionExpiresAt(now),
      createdAt: now,
      updatedAt: now,
    }
    const [session] = await this.ormService.db
      .insert(sessionsTable)
      .values(newSession)
      .returning()

    const accessToken = await this.jwtService.createSessionAccessToken(session)
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

    const [updatedSession] = await this.ormService.db
      .update(sessionsTable)
      .set({
        expiresAt: sessionExpiresAt(new Date(session.createdAt)),
        hash: hashedTokenHelper.createHash(secret),
      })
      .where(eq(sessionsTable.id, session.id))
      .returning()

    // Create new access and refresh tokens
    const accessToken =
      await this.jwtService.createSessionAccessToken(updatedSession)
    const refreshToken = hashedTokenHelper.encode(updatedSession.id, secret)

    return {
      accessToken,
      refreshToken,
      expiresAt: session.expiresAt,
    }
  }

  async verifySessionWithAccessToken(accessToken: AccessTokenJWT) {
    const returnedSessions = await this.ormService.db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, accessToken.jti.split(':')[0]))

    if (returnedSessions.length === 0) {
      throw new SessionInvalidException()
    }

    const session = returnedSessions[0]

    if (Date.now() > new Date(session.expiresAt).getTime()) {
      throw new SessionExpiredException()
    }

    return session
  }
}
