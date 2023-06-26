import type { TimestampData } from '../../../transfer-objects/timestamps.dto'
import type { EmailFormat } from '../../../util/validation.util'
import type { PlatformRole } from '../../auth/constants/role.constants'

export interface UserData extends TimestampData {
  readonly id: string
  readonly role: PlatformRole
  email?: EmailFormat
  username: string
}
