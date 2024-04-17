import { ZodValidationPipe } from '@anatine/zod-nestjs'
import { Body, Controller, Post, UsePipes } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { LoginCredentialsDTO } from '../dto/login-credentials.dto'
import type { LoginResponse } from '../dto/responses/login-response.dto'
import type { SignupResponse } from '../dto/responses/signup-response.dto'
import { SignupCredentialsDTO } from '../dto/signup-credentials.dto'
import { AuthService } from '../services/auth.service'

@Controller('/auth')
@ApiTags('Auth')
@UsePipes(ZodValidationPipe)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Authenticate the user and return access and refresh tokens.
   */
  @Post('/login')
  async login(@Body() input: LoginCredentialsDTO): Promise<LoginResponse> {
    const session = await this.authService.login(input)
    return {
      session,
    }
  }

  /**
   * Register a new user.
   */
  @Post('/signup')
  async signup(@Body() input: SignupCredentialsDTO): Promise<SignupResponse> {
    const user = await this.authService.signup(input)
    return { user }
  }
}
