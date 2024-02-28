import { Body, Controller, Post } from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'

import { AuthService } from './auth.service'
import { LoginDTO } from './login.dto'
import { UserSessionDTO } from './user-session.dto'

@Controller('/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  @ApiResponse({
    status: 200,
    description: 'Authenticate the user and return access and refresh tokens.',
    type: UserSessionDTO,
  })
  login(@Body() _input: LoginDTO): UserSessionDTO {
    return {
      accessToken: '',
      refreshToken: '',
    }
  }
}
