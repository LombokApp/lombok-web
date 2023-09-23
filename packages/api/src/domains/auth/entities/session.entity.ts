import { Entity, OptionalProps, Property } from '@mikro-orm/core'
import { addMs, earliest } from '@stellariscloud/utils'

import { AuthDurationMs } from '../constants/duration.constants'
import type { SessionData } from '../transfer-objects/session.dto'
import { BaseScopedAuthEntity } from './base-scoped-auth.entity'
import { SessionRepository } from './session.repository'

@Entity({ customRepository: () => SessionRepository })
export class Session extends BaseScopedAuthEntity<Session> {
  [OptionalProps]?: 'updatedAt' | 'createdAt' | 'hash'

  @Property()
  expiresAt!: Date

  static sessionExpiresAt(createdAt: Date) {
    return earliest(
      addMs(new Date(), AuthDurationMs.SessionSliding),
      addMs(createdAt, AuthDurationMs.SessionAbsolute),
    )
  }

  toSessionData(): Omit<SessionData, 'accessToken'> {
    return this.toObjectPick(['expiresAt'])
  }

  toJSON() {
    return this.toSessionData()
  }
}
