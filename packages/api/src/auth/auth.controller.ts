import { Body, Controller, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { AuthService } from './services/auth.service'
import { LoginDTO } from './transfer-objects/login.dto'
import { UserSessionDTO } from './transfer-objects/user-session.dto'

@Controller('/auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Authenticate the user and return access and refresh tokens.
   */
  @Post('/login')
  login(@Body() _input: LoginDTO): UserSessionDTO {
    return {
      accessToken: '',
      refreshToken: '',
    }
  }
}
