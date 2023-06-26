import { Entity, EntityRepositoryType, OptionalProps } from '@mikro-orm/core'

import { AccessTokenRepository } from './access-token.repository'
import { BaseHashedAccessTokenEntity } from './base-hashed-token.entity'

@Entity({ customRepository: () => AccessTokenRepository })
export class AccessToken extends BaseHashedAccessTokenEntity {
  [EntityRepositoryType]?: AccessTokenRepository;
  [OptionalProps]?: 'updatedAt' | 'createdAt' | 'hash'

  toAccessTokenData(): { id: string } {
    return { id: this.id }
  }

  toJSON() {
    return this.toAccessTokenData()
  }
}
