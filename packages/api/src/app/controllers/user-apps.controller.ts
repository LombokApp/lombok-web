import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { ZodValidationPipe } from 'nestjs-zod'
import { AppService } from 'src/app/services/app.service'
import { AppCustomSettingsService } from 'src/app/services/app-custom-settings.service'
import { LoginResponse } from 'src/auth/dto/responses/login-response.dto'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { ApiStandardErrorResponses } from 'src/shared/decorators/api-standard-error-responses.decorator'

import { AppCustomSettingsPutInputDTO } from '../dto/app-custom-settings-put-input.dto'
import { AppUserSettingsCreateInputDTO } from '../dto/app-user-settings-create-input.dto'
import { AppContributionsResponse } from '../dto/responses/app-contributions-response.dto'
import { AppCustomSettingsGetResponseDTO } from '../dto/responses/app-custom-settings-get-response.dto'
import { AppUserSettingsGetResponseDTO } from '../dto/responses/app-user-settings-get-response.dto'
import { UserAppGetResponse } from '../dto/responses/user-app-get-response.dto'
import { UserAppListResponse } from '../dto/responses/user-app-list-response.dto'
import { transformAppToUserDTO } from '../dto/transforms/user-app.transforms'

@Controller('/api/v1/user')
@ApiTags('User Apps')
@UsePipes(ZodValidationPipe)
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiStandardErrorResponses()
export class UserAppsController {
  constructor(
    private readonly appService: AppService,
    private readonly appCustomSettingsService: AppCustomSettingsService,
  ) {}

  /**
   * List enabled apps available for the current user
   */
  @Get('/apps')
  async listApps(@Req() req: express.Request): Promise<UserAppListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const { result: apps, meta } = await this.appService.listEnabledAppsAsUser()
    const result = apps.map((app) => transformAppToUserDTO(app))
    return {
      result,
      meta,
    }
  }

  /**
   * Get an enabled app by identifier for the current user
   */
  @Get('/apps/:appIdentifier')
  async getApp(
    @Req() req: express.Request,
    @Param('appIdentifier') appIdentifier: string,
  ): Promise<UserAppGetResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const app = await this.appService.getAppAsUser(appIdentifier)
    if (!app) {
      throw new NotFoundException()
    }

    return {
      app: transformAppToUserDTO(app),
    }
  }

  /**
   * Get app contributions
   */
  @Get('/app-contributions')
  async getAppContributions(
    @Req() req: express.Request,
  ): Promise<AppContributionsResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const contributions = await this.appService.getAppContributions()
    return contributions
  }

  /**
   * Generate app user access token
   */
  @Post('/apps/:appIdentifier/access-token')
  async generateAppUserAccessToken(
    @Req() req: express.Request,
    @Param('appIdentifier') appIdentifier: string,
  ): Promise<LoginResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }

    const session = await this.appService.createAppUserSession(
      req.user,
      appIdentifier,
    )

    return {
      session: {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.session.expiresAt.toISOString(),
      },
    }
  }

  /**
   * Get app user settings for the current user
   */
  @Get('/apps/:appIdentifier/settings')
  async getAppUserSettings(
    @Req() req: express.Request,
    @Param('appIdentifier') appIdentifier: string,
  ): Promise<AppUserSettingsGetResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const settings = await this.appService.getAppUserSettings(
      req.user,
      appIdentifier,
    )
    return { settings }
  }

  /**
   * Create or update app user settings for the current user
   */
  @Post('/apps/:appIdentifier/settings')
  async upsertAppUserSettings(
    @Req() req: express.Request,
    @Param('appIdentifier') appIdentifier: string,
    @Body() body: AppUserSettingsCreateInputDTO,
  ): Promise<AppUserSettingsGetResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const settings = await this.appService.upsertAppUserSettings(
      req.user,
      appIdentifier,
      body.enabled,
      body.folderScopeEnabledDefault,
      body.folderScopePermissionsDefault,
      body.permissions,
    )
    return { settings }
  }

  /**
   * Remove app user settings for the current user
   */
  @Delete('/apps/:appIdentifier/settings')
  async removeAppUserSettings(
    @Req() req: express.Request,
    @Param('appIdentifier') appIdentifier: string,
  ): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    await this.appService.removeAppUserSettings(req.user, appIdentifier)
  }

  /**
   * Get resolved custom settings for the current user
   */
  @Get('/apps/:appIdentifier/custom-settings')
  async getUserCustomSettings(
    @Req() req: express.Request,
    @Param('appIdentifier') appIdentifier: string,
  ): Promise<AppCustomSettingsGetResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const app = await this.appCustomSettingsService.getAppOrThrow(appIdentifier)
    const result = await this.appCustomSettingsService.getUserCustomSettings(
      req.user.id,
      app,
    )
    return { settings: result }
  }

  /**
   * Update custom settings for the current user (merge semantics)
   */
  @Put('/apps/:appIdentifier/custom-settings')
  async putUserCustomSettings(
    @Req() req: express.Request,
    @Param('appIdentifier') appIdentifier: string,
    @Body() body: AppCustomSettingsPutInputDTO,
  ): Promise<AppCustomSettingsGetResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const app = await this.appCustomSettingsService.getAppOrThrow(appIdentifier)
    const result = await this.appCustomSettingsService.putUserCustomSettings(
      req.user.id,
      app,
      body.values,
    )
    return { settings: result }
  }

  /**
   * Remove custom settings for the current user (revert to defaults)
   */
  @Delete('/apps/:appIdentifier/custom-settings')
  async deleteUserCustomSettings(
    @Req() req: express.Request,
    @Param('appIdentifier') appIdentifier: string,
  ): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const app = await this.appCustomSettingsService.getAppOrThrow(appIdentifier)
    await this.appCustomSettingsService.deleteUserCustomSettings(
      req.user.id,
      app,
    )
  }
}
