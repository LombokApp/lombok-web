export class UpdateUserDTO {
  isAdmin?: boolean
  emailVerified?: boolean
  password?: string
  name?: string
  email?: string
  permissions?: string[]
}
