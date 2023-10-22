import { PlatformRole } from '../../auth/constants/role.constants'
import type { User } from '../entities/user.entity'
import type { UserData } from '../transfer-objects/user.dto'

export const transformUserToUserDTO = (user: User): UserData => ({
  id: user.id,
  name: user.name,
  permissions: user.permissions,
  role: user.role,
  email: user.email,
  emailVerified: user.emailVerified,
  isAdmin: user.role === PlatformRole.Admin,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
})
