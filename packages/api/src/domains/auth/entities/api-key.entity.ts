import {
  Entity,
  EntityRepositoryType,
  OptionalProps,
  Property,
  TextType,
} from '@mikro-orm/core'

import { ApiKeyRepository } from './api-key.repository'
import { BaseAccessTokenEntity } from './base-access-token.entity'

@Entity({ customRepository: () => ApiKeyRepository })
export class ApiKey extends BaseAccessTokenEntity {
  [EntityRepositoryType]?: ApiKeyRepository;
  [OptionalProps]?: 'updatedAt' | 'createdAt' | 'hash'

  @Property({ type: TextType })
  secret!: string

  toApiKeyData(): { id: string; secret: string } {
    return { id: this.id, secret: this.secret }
  }

  toJSON() {
    return this.toApiKeyData()
  }
}
