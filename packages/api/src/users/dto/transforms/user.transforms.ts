import type { User } from 'src/users/entities/user.entity'

import type { UserDTO } from '../user.dto'

export function transformUserToDTO(user: User): UserDTO {
  return {
    id: user.id,
    username: user.username,
    name: user.name ?? null,
    email: user.email ?? null,
    emailVerified: user.emailVerified,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    permissions: user.permissions,
  }
}
