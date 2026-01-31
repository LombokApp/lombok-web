import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { GOOGLE_OAUTH_CONFIG } from 'src/server/constants/server.constants'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'

export interface ProviderUserInfo {
  id: string
  email?: string
  name?: string
  picture?: string
}

export interface GoogleUserInfo extends ProviderUserInfo {
  picture?: string
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name)
  constructor(
    private readonly serverConfigurationService: ServerConfigurationService,
  ) {}

  private async getGoogleOAuthConfig() {
    const googleOAuthConfig =
      await this.serverConfigurationService.getServerConfig(GOOGLE_OAUTH_CONFIG)

    if (!googleOAuthConfig?.enabled) {
      throw new BadRequestException('Google OAuth is not enabled')
    }

    if (!googleOAuthConfig.clientId || !googleOAuthConfig.clientSecret) {
      throw new BadRequestException('Google OAuth is not properly configured')
    }

    // Calculate redirect URI based on server hostname
    const redirectUriPath = `/sso/callback/google`

    return {
      ...googleOAuthConfig,
      redirectUriPath,
    }
  }

  async handleGoogleCallback(
    code: string,
    origin: string,
  ): Promise<GoogleUserInfo> {
    try {
      const config = await this.getGoogleOAuthConfig()

      const bodyParams = {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        include_granted_scopes: 'true',
        grant_type: 'authorization_code',
        redirect_uri: `${origin}${config.redirectUriPath}`,
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(bodyParams),
      })

      if (!tokenResponse.ok) {
        this.logger.error(
          'Failed to exchange code for token',
          await tokenResponse.text(),
        )
        throw new BadRequestException('Failed to exchange code for token')
      }

      const tokens = (await tokenResponse.json()) as { access_token: string }

      // Get user info
      const userResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        },
      )

      if (!userResponse.ok) {
        throw new BadRequestException('Failed to get user info from Google')
      }

      const userInfo = (await userResponse.json()) as {
        id: string
        email: string
        verified_email: boolean
        name: string
        picture: string
      }

      return {
        id: userInfo.id,
        email: userInfo.verified_email ? userInfo.email : undefined,
        name: userInfo.name,
        picture: userInfo.picture,
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error
      }
      throw new BadRequestException('OAuth flow failed')
    }
  }

  async getGoogleAuthUrl(origin: string): Promise<string> {
    const config = await this.getGoogleOAuthConfig()

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: `${origin}${config.redirectUriPath}`,
      scope: 'openid email profile',
      response_type: 'code',
      access_type: 'offline',
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }
}
