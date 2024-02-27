import { Body, Controller, Get, Post } from '@nestjs/common'

import { AuthService } from './auth.service'
import { type LoginDTO } from './login.dto'

@Controller('/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  login(@Body() input: LoginDTO): string {
    return this.authService.login(input)
  }

  @Get('/test')
  test(): string {
    return 'yay!'
  }
}
