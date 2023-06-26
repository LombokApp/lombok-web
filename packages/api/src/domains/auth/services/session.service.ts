import { Lifecycle, scoped } from 'tsyringe'

import type { User } from '../../user/entities/user.entity'
import { UserService } from '../../user/services/user.service'
import type { Actor } from '../actor'
import { ALLOWED_SCOPES } from '../constants/scope.constants'
import type { Credential } from '../credential'
import { Session } from '../entities/session.entity'
import { SessionRepository } from '../entities/session.repository'
import {
  SessionExpiredError,
  SessionInvalidError,
  SessionNotFoundError,
} from '../errors/session.error'
import type { SessionData } from '../transfer-objects/session.dto'
import { AccessTokenJWT, AuthTokenService } from './auth-token.service'

@scoped(Lifecycle.ContainerScoped)
export class SessionService {
  constructor(
    private readonly userService: UserService,
    private readonly authTokenService: AuthTokenService,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async createSession(actor: Actor, credential: Credential) {
    if (credential instanceof Session || credential instanceof AccessTokenJWT) {
      await this.revoke(actor, credential)
    }

    const user = await this.userService.get({ id: actor.id })

    const secret = Session.createSecretKey()

    const session = this.sessionRepository.create({
      deleted: false,
      scopes: ALLOWED_SCOPES[user.role],
      secret,
      user: user as unknown as User,
    }) as unknown as Session

    await this.sessionRepository.getEntityManager().persistAndFlush(session)
    const accessToken =
      this.authTokenService.createAccessTokenValueFromEntity(session)
    const refreshToken = Session.encode(session.id, secret)

    return {
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
      },
      accessToken,
      refreshToken,
    }
  }

  refresh(session: Session) {
    const accessToken =
      this.authTokenService.createAccessTokenValueFromEntity(session)

    const newSession: SessionData = {
      expiresAt: session.expiresAt,
      accessToken,
    }

    return newSession
  }

  async revoke(actor: Actor, credential: Session | AccessTokenJWT) {
    if (credential instanceof Session) {
      await this.delete(credential)
      return
    }

    try {
      const key = await this.getById(actor, credential.jti)
      await this.delete(key as unknown as Session)
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
    this.sessionRepository.assign(key, { deleted: true })

    await this.sessionRepository.getEntityManager().persistAndFlush(key)
  }

  async verify(token: string) {
    const [id, secret] = Session.decode(token)
    console.log('verify session:', { id, secret })
    const key = (await this.sessionRepository.findOne({
      id,
      hash: Session.createHash(secret),
    })) as Session | null

    if (!key) {
      throw new SessionInvalidError()
    }

    if (Date.now() > key.expiresAt.getTime()) {
      throw new SessionExpiredError(key.expiresAt)
    }

    // Extend the session
    this.sessionRepository.assign(key, {
      expiresAt: Session.sessionExpiresAt(key),
    })

    await this.sessionRepository.getEntityManager().persistAndFlush(key)

    return key
  }
}
