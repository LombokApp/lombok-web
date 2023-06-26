import { Lifecycle, scoped } from 'tsyringe'

import type { User } from '../../user/entities/user.entity'
import type { Actor } from '../actor'
import { API_KEY_SCOPES } from '../constants/scope.constants'
import { AccessToken } from '../entities/access-token.entity'
import { AccessTokenRepository } from '../entities/access-token.repository'
import { ApiKeyRepository } from '../entities/api-key.repository'
import {
  AccessTokenInvalidError,
  AccessTokenNotFoundError,
} from '../errors/access-token.error'
import { AuthTokenService } from './auth-token.service'

@scoped(Lifecycle.ContainerScoped)
export class AccessTokenService {
  constructor(
    private readonly authTokenService: AuthTokenService,
    private readonly apiKeyRepository: ApiKeyRepository,
    private readonly accessTokenRepository: AccessTokenRepository,
  ) {}

  async createApiKey(user: User) {
    const secret = AccessToken.createSecretKey(16).toString('hex')

    const apiKey = this.apiKeyRepository.create({
      deleted: false,
      secret: secret.toString(),
      scopes: API_KEY_SCOPES,
      user,
    })

    await this.apiKeyRepository.persistAndFlush(apiKey)

    return apiKey
  }

  async createAccessToken(user: User) {
    const secret = AccessToken.createSecretKey()

    const accessToken = this.accessTokenRepository.create({
      deleted: false,
      secret,
      scopes: API_KEY_SCOPES,
      user,
    })

    await this.accessTokenRepository.persistAndFlush(accessToken)

    return accessToken
  }

  async removeAccessToken(actor: Actor, accessTokenId: string) {
    const accessToken = await this.accessTokenRepository.findOne({
      id: accessTokenId,
      user: actor.id,
    })

    if (accessToken === null) {
      throw new AccessTokenNotFoundError()
    }

    this.accessTokenRepository.remove(accessToken)
    await this.accessTokenRepository.flush()
  }

  async listAccessTokens(actor: Actor) {
    return this.accessTokenRepository.findAndCount({
      user: actor.id,
    })
  }

  async revoke(credential: AccessToken) {
    await this.delete(credential)
  }

  async getById(actor: Actor, id: string) {
    const key = await this.accessTokenRepository.findOne({
      id,
      user: actor.id,
    })

    if (key === null) {
      throw new AccessTokenNotFoundError()
    }

    return key
  }

  async delete(key: AccessToken) {
    this.accessTokenRepository.assign(key, { deleted: true })

    await this.accessTokenRepository.persistAndFlush(key)
  }

  async verify(token: string) {
    const [id, secret] = AccessToken.decode(token)

    const key = (await this.accessTokenRepository.findOne({
      id,
      hash: AccessToken.createHash(secret),
    })) as AccessToken | null

    if (!key) {
      throw new AccessTokenInvalidError()
    }
    return key
  }
}
