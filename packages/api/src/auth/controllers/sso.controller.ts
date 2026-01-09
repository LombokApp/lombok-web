import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  Request,
  UsePipes,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ApiStandardErrorResponses } from 'src/shared/decorators/api-standard-error-responses.decorator'
import { transformUserToDTO } from 'src/users/dto/transforms/user.transforms'

import { CompleteSSOSignupDTO } from '../dto/sso/complete-sso-signup.dto'
import { LinkSSOProviderDTO } from '../dto/sso/link-sso-provider.dto'
import {
  CompleteSSOSignupResponse,
  InitiateSSOResponse,
  LinkProviderResponse,
  SSOCallbackResponse,
} from '../dto/sso/responses'
import { SSOCallbackDTO } from '../dto/sso/sso-callback.dto'
import { AuthService } from '../services/auth.service'

interface AuthenticatedRequest extends Request {
  user: {
    id: string
    username: string
    email?: string
    isAdmin: boolean
    permissions: string[]
  }
}

@Controller('/api/v1/auth/sso')
@ApiTags('SSO')
@UsePipes(ZodValidationPipe)
@ApiStandardErrorResponses()
export class SSOController {
  constructor(private readonly authService: AuthService) {}
  /**
   * Complete SSO signup by choosing username
   */
  @Post('/complete-signup')
  async completeSignup(
    @Body() body: CompleteSSOSignupDTO,
  ): Promise<CompleteSSOSignupResponse> {
    return this.authService.completeSSOSignup(body).then((result) => ({
      user: transformUserToDTO(result.user),
      expiresAt: result.expiresAt.toISOString(),
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }))
  }

  /**
   * Initiate SSO login flow - returns OAuth URL
   */
  @Post('/initiate/:provider')
  async initiateSSO(
    @Param('provider') provider: string,
    @Req() req: Request,
  ): Promise<InitiateSSOResponse> {
    return this.authService.initiateSSOSignup(
      provider,
      req.headers['origin'] as string,
    )
  }

  /**
   * Handle OAuth callback from provider
   */
  @Post('/callback/:provider')
  async handleCallback(
    @Param('provider') provider: string,
    @Body() body: SSOCallbackDTO,
    @Req() req: Request,
  ): Promise<SSOCallbackResponse> {
    const handleSSOResult = await this.authService.handleSSOCallback(
      provider,
      body.code,
      req.headers['origin'] as string,
    )
    return handleSSOResult
  }

  /**
   * Link SSO provider to existing account
   */
  @Post('/link-provider')
  @ApiBearerAuth()
  async linkProvider(
    @Body() body: LinkSSOProviderDTO,
    @Request() req: AuthenticatedRequest,
  ): Promise<LinkProviderResponse> {
    return this.authService.linkSSOProvider(
      req.user.id,
      body.provider,
      body.code,
      req.headers['origin'] as string,
    )
  }
}
