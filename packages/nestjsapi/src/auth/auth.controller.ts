import { Controller, Get, Post } from '@nestjs/common'
import { AuthService } from './auth.service'

export type LoginInput = {
  login: string
  password: string
}

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  login(input: LoginInput): string {
    return this.authService.login(input)
  }
}
