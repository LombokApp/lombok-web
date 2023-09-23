import express from 'express'
import {
  Body,
  Controller,
  Get,
  OperationId,
  Post,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from 'tsoa'
import { Lifecycle, scoped } from 'tsyringe'

import { AuthScheme } from '../domains/auth/constants/scheme.constants'
import { SessionInvalidError } from '../domains/auth/errors/session.error'
import { AuthService } from '../domains/auth/services/auth.service'
import { SessionService } from '../domains/auth/services/session.service'
import type { SessionData } from '../domains/auth/transfer-objects/session.dto'
import { UserAuthService } from '../domains/user/services/user-auth.service'
import { UnauthorizedError } from '../errors/auth.error'
import type { ErrorResponse } from '../transfer-objects/error-response.dto'

export interface SignupParams {
  /**
   * @maxLength 255
   */
  email: string

  /**
   * @maxLength 255
   */
  password: string
}

export interface SessionResponse {
  data: {
    accessToken: SessionData['accessToken']
    refreshToken: SessionData['refreshToken']
    expiresAt: SessionData['expiresAt']
  }
}

export interface LoginParams {
  login: string
  password: string
}

export interface ApiKeyResponse {
  data: {
    apiKey: {
      id: string
    }
    accessToken: string
  }
}

// interface CreatePasswordChangeParams {
//   login: string
// }

// interface ChangePasswordParams {
//   password: string
// }

// interface CreateEmailVerificationParams {
//   login: string
// }

@scoped(Lifecycle.ContainerScoped)
@Route()
@Tags('Auth')
export class AuthController extends Controller {
  constructor(
    private readonly sessionService: SessionService,
    private readonly authService: AuthService,
    private readonly userAuthService: UserAuthService,
  ) {
    super()
  }

  @Security(AuthScheme.RefreshToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('refreshToken')
  @Post('token')
  async refreshToken(
    @Request() req: express.Request,
  ): Promise<SessionResponse> {
    if (!req.session) {
      throw new SessionInvalidError()
    }

    const { accessToken, refreshToken, expiresAt } =
      await this.sessionService.extendSession(req.session)

    // return { data: session } as SessionResponse
    return {
      data: {
        accessToken,
        refreshToken,
        expiresAt,
      },
    }
  }

  /**
   * Given a user's credentials, this endpoint will create a new user.
   */
  @SuccessResponse(201)
  @OperationId('Signup')
  @Post('signup')
  async signup(@Body() body: { data: SignupParams }) {
    const user = await this.authService.signup(body.data)

    this.setStatus(201)

    return { data: user }
  }

  @Security(AuthScheme.Public)
  @Response<ErrorResponse>('4XX')
  @OperationId('Login')
  @Post('login')
  async login(@Body() body: LoginParams): Promise<SessionResponse> {
    const { expiresAt, accessToken, refreshToken } =
      await this.userAuthService.authenticateWithPassword(
        body.login,
        body.password,
      )

    return { data: { accessToken, refreshToken, expiresAt } }
  }

  @Security(AuthScheme.AccessToken)
  @SuccessResponse(204)
  @Response<ErrorResponse>('4XX')
  @OperationId('logout')
  @Get('logout')
  async logout(@Request() req: express.Request) {
    if (!req.session) {
      throw new UnauthorizedError()
    }
    await this.sessionService.revokeSession(req.session)

    this.setStatus(204)
  }

  /**
   * Given a user's email address or username, the backend will send a
   * change a password email.
   */
  // @Security(AuthScheme.PasswordChange)
  // @SuccessResponse(204)
  // @OperationId('changePassword')
  // @Put('password')
  // async changePassword(
  //   @Request() req: Express.Request,
  //   @Body() body: { data: ChangePasswordParams },
  // ) {
  //   await this.userAuthService.changePassword(
  //     req.credentials as ApiKey,
  //     body.data.password,
  //   )

  //   this.setStatus(204)
  // }

  // @OperationId('createEmailVerification')
  // @SuccessResponse(204)
  // @Post('email-verification')
  // createEmailVerification(
  //   @Body() body: { data: CreateEmailVerificationParams },
  // ) {
  //   void this.userAuthService.sendEmailVerification(body.data.login)

  //   this.setStatus(204)
  // }

  // @Security(AuthScheme.EmailVerification)
  // @SuccessResponse(204)
  // @OperationId('verifyEmail')
  // @Put('verify-email')
  // async verify(@Request() req: Express.Request) {
  //   await this.userAuthService.verifyEmail(req.credentials as ApiKey)

  //   this.setStatus(204)
  // }
}
