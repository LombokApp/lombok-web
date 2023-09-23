import type { TimestampData } from '../../../transfer-objects/timestamps.dto'
import type { EmailFormat } from '../../../util/validation.util'
import type { PlatformRole } from '../../auth/constants/role.constants'

export interface UserData extends TimestampData {
  readonly id: string
  readonly role: PlatformRole
  email?: EmailFormat
}

export interface UpdateUserDto {
  admin?: boolean
  emailVerified?: boolean
  totpEnabled?: boolean
  password?: string

  /**
   * @maxLength 255
   */
  name?: string
}

export interface CreateUserDto extends UpdateUserDto {
  /**
   * @maxLength 255
   */
  email: string
}
