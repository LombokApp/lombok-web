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

import { PlatformRole } from '../domains/auth/constants/role.constants'
import { AuthScheme } from '../domains/auth/constants/scheme.constants'
import type { Session } from '../domains/auth/entities/session.entity'
import { AccessTokenService } from '../domains/auth/services/access-token.service'
import type { AccessTokenJWT } from '../domains/auth/services/auth-token.service'
import { SessionService } from '../domains/auth/services/session.service'
import type { SessionData } from '../domains/auth/transfer-objects/session.dto'
import { UserService } from '../domains/user/services/user.service'
import type { ErrorResponse } from '../transfer-objects/error-response.dto'

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

@scoped(Lifecycle.ContainerScoped)
@Route()
@Tags('Auth')
export class AuthController extends Controller {
  constructor(
    private readonly apiKeyService: AccessTokenService,
    private readonly sessionService: SessionService,
    private readonly userService: UserService,
  ) {
    super()
  }

  @Security(AuthScheme.RefreshToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('refreshToken')
  @Post('token')
  refreshToken(@Request() req: express.Request) {
    const session = this.sessionService.refresh(req.credential as Session)

    return { data: session } as SessionResponse
  }

  @Security(AuthScheme.Public)
  @Response<ErrorResponse>('4XX')
  @OperationId('login')
  @Post('login')
  async login(@Request() req: express.Request, @Body() _body: LoginParams) {
    // WARN: this is dev logic that authenticates all users as the requested user id (in the login param)...
    // TODO: replace this with future login model
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    console.log('logging in:', ip)
    const user = await this.userService.get({
      id: process.env.DEMO_USER_ID
        ? process.env.DEMO_USER_ID
        : ip === '92.68.180.183'
        ? '6edd317d-9af8-42e3-9f0c-99cf027a1262'
        : '3edd317d-9af8-42e3-9f0c-99cf027a1262',
    })
    const { session, accessToken, refreshToken } =
      await this.sessionService.createSession(
        {
          id: user.id,
          user,
          authenticated: true,
          role: PlatformRole.Authenticated,
        },
        `dummy_session_${user.id}`,
      )

    return {
      data: {
        ...session,
        expiresAt: session.expiresAt,
        accessToken,
        refreshToken,
      },
    } as SessionResponse
  }

  @Security(AuthScheme.AccessToken)
  @Security(AuthScheme.RefreshToken)
  @SuccessResponse(204)
  @Response<ErrorResponse>('4XX')
  @OperationId('logout')
  @Get('logout')
  async logout(@Request() req: express.Request) {
    await this.sessionService.revoke(
      req.viewer,
      req.credential as Session | AccessTokenJWT,
    )

    this.setStatus(204)
  }
}
