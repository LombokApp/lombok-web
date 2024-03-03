import { Body, Controller, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { AuthService } from './services/auth.service'
import { LoginCredentialsDTO } from './transfer-objects/login-credentials.dto'
import { UserSessionDTO } from './transfer-objects/user-session.dto'

@Controller('/auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Authenticate the user and return access and refresh tokens.
   */
  @Post('/login')
  login(@Body() _input: LoginCredentialsDTO): UserSessionDTO {
    return {
      accessToken: '',
      refreshToken: '',
    }
  }
}
