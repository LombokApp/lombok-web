import type { TimestampDTO } from 'src/core/transfer-objects/timestamps.dto'

export interface UserDTO extends TimestampDTO {
  readonly id: string
  name: string | null
  email: string | null
  emailVerified: boolean
  isAdmin: boolean
  username?: string
  permissions: string[]
}
