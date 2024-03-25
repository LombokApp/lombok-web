export class CreateUserDTO {
  username: string
  password: string
  isAdmin?: boolean
  emailVerified?: boolean
  name?: string
  email?: string
  permissions?: string[]
}
