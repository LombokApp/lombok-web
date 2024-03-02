import type { User } from '../entities/user.entity'
import type { UserData } from '../transfer-objects/user.dto'

export const transformUserToUserDTO = (user: User): UserData => ({
  id: user.id,
  name: user.name,
  permissions: user.permissions,
  username: user.username,
  isAdmin: user.isAdmin,
  email: user.email,
  emailVerified: user.emailVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
})
