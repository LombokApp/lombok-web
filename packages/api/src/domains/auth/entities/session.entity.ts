import {
  BeforeCreate,
  Entity,
  // EntityRepositoryType,
  OptionalProps,
  Property,
} from '@mikro-orm/core'
import { addMs, earliest } from '@stellariscloud/utils'

import { AuthDurationMs } from '../constants/duration.constants'
import type { SessionData } from '../transfer-objects/session.dto'
import { BaseHashedAccessTokenEntity } from './base-hashed-token.entity'
import { SessionRepository } from './session.repository'

@Entity({ customRepository: () => SessionRepository })
export class Session extends BaseHashedAccessTokenEntity {
  [OptionalProps]?: 'updatedAt' | 'createdAt' | 'hash' | 'expiresAt'

  @Property({ hidden: true })
  hash!: string

  @Property()
  expiresAt!: Date

  @BeforeCreate()
  initExpiresAt() {
    if (this.expiresAt instanceof Date) {
      return
    }

    this.expiresAt = Session.sessionExpiresAt(this)
  }

  static sessionExpiresAt(key: Session) {
    return earliest(
      addMs(new Date(), AuthDurationMs.SessionSliding),
      addMs(key.createdAt, AuthDurationMs.SessionAbsolute),
    )
  }

  toSessionData(): Omit<SessionData, 'accessToken'> {
    return this.toObjectPick(['scopes', 'expiresAt'])
  }

  toJSON() {
    return this.toSessionData()
  }
}
