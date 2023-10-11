import type { TimestampData } from '../../../transfer-objects/timestamps.dto'
import type { EmailFormat, UsernameFormat } from '../../../util/validation.util'
import type { PlatformRole } from '../../auth/constants/role.constants'

export interface UserData extends TimestampData {
  readonly id: string
  readonly role: PlatformRole
  name?: string
  email?: EmailFormat
  username?: UsernameFormat
  permissions: string[]
}

export interface UpdateUserData {
  admin?: boolean
  emailVerified?: boolean
  password?: string

  /**
   * @maxLength 255
   */
  name?: string

  /**
   * @maxLength 255
   */
  email?: string

  permissions?: string[]
}

export interface CreateUserData extends UpdateUserData {
  /**
   * @maxLength 64
   */
  username: string

  password: string
}
