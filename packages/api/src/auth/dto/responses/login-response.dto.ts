import type { UserSessionDTO } from 'src/auth/dto/user-session.dto'

export class LoginResponse {
  session: UserSessionDTO
}
