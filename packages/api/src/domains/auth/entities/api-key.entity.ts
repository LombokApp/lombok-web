import { Entity, EntityRepositoryType, OptionalProps } from '@mikro-orm/core'

import { ApiKeyRepository } from './api-key.repository'
import { BaseScopedAuthEntity } from './base-scoped-auth.entity'

@Entity({ customRepository: () => ApiKeyRepository })
export class ApiKey extends BaseScopedAuthEntity<ApiKey> {
  [EntityRepositoryType]?: ApiKeyRepository;
  [OptionalProps]?: 'updatedAt' | 'createdAt' | 'hash'

  toApiKeyData(): { id: string; secret?: string } {
    return { id: this.id, secret: String(this.secret) }
  }

  toJSON() {
    return this.toApiKeyData()
  }
}
