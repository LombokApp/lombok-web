import type { TimestampData } from '../../../transfer-objects/timestamps.dto'
import type { EmailFormat, UsernameFormat } from '../../../util/validation.util'

export interface UserData extends TimestampData {
  readonly id: string
  name: string | null
  email: EmailFormat | null
  emailVerified: boolean
  isAdmin: boolean
  username?: UsernameFormat
  permissions: string[]
}

export interface UpdateUserData {
  isAdmin?: boolean
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
