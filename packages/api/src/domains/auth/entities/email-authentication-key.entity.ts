import {
  Entity,
  EntityRepositoryType,
  Enum,
  OptionalProps,
} from '@mikro-orm/core'

import { BaseScopedAuthEntity } from './base-scoped-auth.entity'
import type { EmailAuthenticationKeyRepository } from './email-authentication-key.repository'

export enum EmailAuthenticationKeyType {
  ResetPassword = 'ResetPassword',
  VerifyEmail = 'VerifyEmail',
}

@Entity({ customRepository: () => EmailAuthenticationKey })
export class EmailAuthenticationKey extends BaseScopedAuthEntity<EmailAuthenticationKey> {
  [EntityRepositoryType]?: EmailAuthenticationKeyRepository;
  [OptionalProps]?: 'updatedAt' | 'createdAt' | 'hash'

  @Enum({ index: true })
  keyType!: EmailAuthenticationKeyType

  toEmailAuthenticationKeyData(): { id: string; secret?: string } {
    return { id: this.id, secret: String(this.secret) }
  }

  toJSON() {
    return this.toEmailAuthenticationKeyData()
  }
}
