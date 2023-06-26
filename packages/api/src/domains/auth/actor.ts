import * as r from 'runtypes'

import { UnauthorizedError } from '../../errors/auth.error'
import type { User } from '../user/entities/user.entity'
import type { PlatformRole } from './constants/role.constants'
import { PLATFORM_ROLES, PlatformRoleType } from './constants/role.constants'

export const ActorType: r.Runtype<Actor> = r.Record({
  id: r.String,
  role: PlatformRoleType,
  authenticated: r.Boolean,
  user: r.Record({
    id: r.String,
    name: r.String.nullable().optional(),
    email: r.String.nullable().optional(),
    ethAccount: r.String,
  }),
})

export abstract class Actor {
  abstract id: string
  abstract role: PlatformRole
  abstract authenticated: boolean
  abstract user: {
    id: string
    name?: string | null
    email?: string | null
  }

  static fromUser(user: User) {
    return {
      id: user.id,
      role: user.role,
      user,
      authenticated: true,
    }
  }

  static isActor(value: unknown): value is Actor {
    return ActorType.guard(value)
  }

  static assert(value: unknown): asserts value is Actor {
    ActorType.assert(value)
  }

  static hasRole(actor: Actor, role: PlatformRole) {
    return PLATFORM_ROLES[actor.role] >= PLATFORM_ROLES[role]
  }

  static assertRole(actor: Actor | null, role: PlatformRole) {
    if (!actor || !Actor.hasRole(actor, role)) {
      throw new UnauthorizedError()
    }
  }
}
