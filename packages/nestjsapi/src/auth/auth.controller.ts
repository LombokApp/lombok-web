import { Body, Controller, Post } from '@nestjs/common'

import { AuthService } from './auth.service'
import { LoginDTO } from './login.dto'

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  login(@Body() input: LoginDTO): string {
    return this.authService.login(input)
  }
}
