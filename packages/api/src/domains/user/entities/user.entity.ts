import {
  Entity,
  EntityRepositoryType,
  Enum,
  OptionalProps,
  PrimaryKey,
  Property,
  TextType,
  UuidType,
} from '@mikro-orm/core'

import { TimestampedEntity } from '../../../entities/base.entity'
import { PlatformRole } from '../../auth/constants/role.constants'
import { UserStatus } from '../constants/user.constants'
import type { UserData } from '../transfer-objects/user.dto'
import { UserRepository } from './user.repository'

@Entity({ customRepository: () => UserRepository })
export class User extends TimestampedEntity {
  [EntityRepositoryType]?: UserRepository;
  [OptionalProps]?: 'updatedAt' | 'createdAt'

  @PrimaryKey({ customType: new UuidType(), defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Enum()
  role: PlatformRole = PlatformRole.Authenticated

  @Enum()
  status: UserStatus = UserStatus.Pending

  /**
   * Name
   */
  @Property({ type: TextType, unique: true })
  username!: string

  /**
   * Email
   */
  @Property({ columnType: 'citext' })
  email?: string

  toUserData(): UserData {
    return this.toObjectPick([
      'id',
      'username',
      'role',
      'email',
      'createdAt',
      'updatedAt',
    ])
  }

  toJSON() {
    return this.toUserData()
  }
}
