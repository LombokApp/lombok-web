import { Body, Controller, Post } from '@nestjs/common'

import { AuthService } from './auth.service'
import { type LoginDTO } from './login.dto'
import { type UserAuthenticationDTO } from './user-authentication.dto'

@Controller('/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  login(@Body() _input: LoginDTO): UserAuthenticationDTO {
    return {
      accessToken: '',
      refreshTroken: '',
    }
  }
}
