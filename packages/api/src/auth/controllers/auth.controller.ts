import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Body,
  Controller,
  forwardRef,
  Inject,
  Param,
  Post,
  UsePipes,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { transformUserToDTO } from 'src/users/dto/transforms/user.transforms'

import { LoginCredentialsDTO } from '../dto/login-credentials.dto'
import type { LoginResponse } from '../dto/responses/login-response.dto'
import type { SignupResponse } from '../dto/responses/signup-response.dto'
import type { TokenRefreshResponse } from '../dto/responses/token-refresh-response.dto'
import { SignupCredentialsDTO } from '../dto/signup-credentials.dto'
import { AuthService } from '../services/auth.service'

@Controller('/api/v1/auth')
@ApiTags('Auth')
@UsePipes(ZodValidationPipe)
export class AuthController {
  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

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
    return { user: transformUserToDTO(user) }
  }

  /**
   * Logout. Kill the current session.
   */
  @Post('/logout')
  @ApiBearerAuth()
  logout(): Promise<boolean> {
    // const session = await this.authService.logout(input)
    return Promise.resolve(true)
  }

  /**
   * Refresh a session with a refresh token.
   */
  @Post('/:refreshToken')
  async refreshToken(
    @Param('refreshToken') token: string,
  ): Promise<TokenRefreshResponse> {
    const { accessToken, refreshToken, session } =
      await this.authService.extendSessionWithRefreshToken(token)
    return {
      session: {
        accessToken,
        refreshToken,
        expiresAt: session.expiresAt,
      },
    }
  }
}
