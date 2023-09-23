import { Lifecycle, scoped } from 'tsyringe'

import { UserService } from '../../user/services/user.service'
import type { Actor } from '../actor'
import { ALLOWED_SCOPES } from '../constants/scope.constants'
import { Session } from '../entities/session.entity'
import { SessionRepository } from '../entities/session.repository'
import {
  SessionExpiredError,
  SessionInvalidError,
  SessionNotFoundError,
} from '../errors/session.error'
import type { AccessTokenJWT } from './jwt.service'
import { JWTService } from './jwt.service'

@scoped(Lifecycle.ContainerScoped)
export class SessionService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JWTService,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async createSession(actor: Actor) {
    const user = await this.userService.get({ id: actor.id })

    const secret = Session.createSecretKey()

    const session = this.sessionRepository.create({
      scopes: ALLOWED_SCOPES[user.role],
      user,
      hash: Session.createHash(secret),
      expiresAt: Session.sessionExpiresAt(new Date()),
    })

    await this.sessionRepository.getEntityManager().persistAndFlush(session)
    const accessToken = this.jwtService.createAccessTokenFromSession(session)
    const refreshToken = Session.encode(session.id, secret)

    return {
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
        user: session.user,
      },
      accessToken,
      refreshToken,
    }
  }

  async revokeSession(session: Session) {
    try {
      await this.delete(session)
    } catch (error) {
      if (!(error instanceof SessionNotFoundError)) {
        throw error
      }
    }
  }

  async getById(actor: Actor, id: string) {
    const key = await this.sessionRepository.findOne({
      id,
      user: actor.id,
    })

    if (key === null) {
      throw new SessionNotFoundError()
    }

    return key
  }

  async delete(key: Session) {
    await this.sessionRepository.nativeDelete(key)
    await this.sessionRepository.getEntityManager().persistAndFlush(key)
  }

  async verifySessionWithRefreshToken(refreshToken: string) {
    const [id, secret] = Session.decode(refreshToken)
    const session = (await this.sessionRepository.findOne({
      id,
      hash: Session.createHash(secret),
    })) as Session | null

    if (!session) {
      throw new SessionInvalidError()
    }

    if (Date.now() > session.expiresAt.getTime()) {
      throw new SessionExpiredError(session.expiresAt)
    }

    return session
  }

  async extendSession(session: Session) {
    if (Date.now() > session.expiresAt.getTime()) {
      throw new SessionExpiredError(session.expiresAt)
    }

    // Create a new secret
    const secret = Session.createSecretKey()

    // Update the hash and expiry of the session
    this.sessionRepository.assign(session, {
      expiresAt: Session.sessionExpiresAt(session.createdAt),
      hash: Session.createHash(secret),
    })

    await this.sessionRepository.getEntityManager().persistAndFlush(session)

    // Create new access and refresh tokens
    const accessToken = this.jwtService.createAccessTokenFromSession(session)
    const refreshToken = Session.encode(session.id, secret)

    return {
      accessToken,
      refreshToken,
      expiresAt: session.expiresAt,
    }
  }

  async verifySessionWithAccessToken(accessToken: AccessTokenJWT) {
    const session = (await this.sessionRepository.findOne({
      id: accessToken.jti.split(':')[0],
    })) as Session | null

    if (!session) {
      throw new SessionInvalidError()
    }

    if (Date.now() > session.expiresAt.getTime()) {
      throw new SessionExpiredError(session.expiresAt)
    }

    await this.sessionRepository.getEntityManager().persistAndFlush(session)

    return session
  }
}
