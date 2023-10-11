import {
  Entity,
  EntityRepositoryType,
  Enum,
  JsonType,
  OptionalProps,
  PrimaryKey,
  Property,
  UuidType,
} from '@mikro-orm/core'
import crypto from 'crypto'

import { TimestampedEntity } from '../../../entities/base.entity'
import { PlatformRole } from '../../auth/constants/role.constants'
import type { UserData } from '../transfer-objects/user.dto'
import { UserRepository } from './user.repository'

@Entity({ customRepository: () => UserRepository })
export class User extends TimestampedEntity<User> {
  [EntityRepositoryType]?: UserRepository;
  [OptionalProps]?: 'updatedAt' | 'createdAt'

  @PrimaryKey({ customType: new UuidType(), defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Enum({ nullable: false })
  role: PlatformRole = PlatformRole.User

  @Property({ columnType: 'TEXT', nullable: false })
  private passwordHash!: string

  @Property({ nullable: false, columnType: 'TEXT' })
  private readonly passwordSalt: string = crypto.randomBytes(64).toString('hex')

  /**
   * Name
   */
  @Property({ columnType: 'TEXT', nullable: true })
  name?: string

  /**
   * Username
   */
  @Property({ columnType: 'citext', unique: true, nullable: false })
  username!: string

  /**
   * Email
   */
  @Property({ columnType: 'citext', unique: true, nullable: true })
  email?: string

  /**
   * Email Verified
   */
  @Property({ nullable: false })
  emailVerified!: boolean

  /**
   * Permissions
   */
  @Property({ customType: new JsonType(), nullable: false })
  permissions: string[] = []

  verifyPassword(password: string) {
    if (!this.passwordHash || !password) {
      return false
    }

    return crypto.timingSafeEqual(
      User.createPasswordHash(password, this.passwordSalt),
      Buffer.from(this.passwordHash, 'hex'),
    )
  }

  static createPasswordHash(password: string, salt: string) {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512')
  }

  setPassword(password: string) {
    this.passwordHash = User.createPasswordHash(
      password,
      this.passwordSalt,
    ).toString('hex')
  }

  toUserData(): UserData {
    return this.toObjectPick([
      'id',
      'role',
      'name',
      'username',
      'email',
      'permissions',
      'createdAt',
      'updatedAt',
    ])
  }

  toJSON() {
    return this.toUserData()
  }
}
