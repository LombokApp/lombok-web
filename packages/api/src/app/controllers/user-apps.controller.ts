import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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

import { AppCustomSettingsPatchInputDTO } from '../dto/app-custom-settings-patch-input.dto'
import { AppUserSettingsCreateInputDTO } from '../dto/app-user-settings-create-input.dto'
import { AppContributionsResponse } from '../dto/responses/app-contributions-response.dto'
import { AppCustomSettingsGetResponseDTO } from '../dto/responses/app-custom-settings-get-response.dto'
import { AppUserSettingsGetResponseDTO } from '../dto/responses/app-user-settings-get-response.dto'
import { UserAppGetResponse } from '../dto/responses/user-app-get-response.dto'
import { UserAppListResponse } from '../dto/responses/user-app-list-response.dto'
import { UserAppStorageListResponseDTO } from '../dto/responses/user-app-storage-list-response.dto'
import { UserAppStoragePresignResponseDTO } from '../dto/responses/user-app-storage-presign-response.dto'
import { transformAppToUserDTO } from '../dto/transforms/user-app.transforms'
import { UserAppStorageListQueryParamsDTO } from '../dto/user-app-storage-list-query-params.dto'
import { UserAppStoragePresignInputDTO } from '../dto/user-app-storage-presign-input.dto'

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

  @Get('/apps')
  async listApps(@Req() req: express.Request): Promise<UserAppListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const { result: apps, meta } = await this.appService.listEnabledAppsAsUser(
      req.user,
    )
    const result = apps.map(({ app, userEnabled }) =>
      transformAppToUserDTO(app, userEnabled),
    )
    return {
      result,
      meta,
    }
  }

  @Get('/apps/:appIdentifier')
  async getApp(
    @Req() req: express.Request,
    @Param('appIdentifier') appIdentifier: string,
  ): Promise<UserAppGetResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const result = await this.appService.getAppAsUser(req.user, appIdentifier)

    return {
      app: transformAppToUserDTO(result.app, result.userEnabled),
    }
  }

  @Get('/apps/:appIdentifier/storage/objects')
  async listAppStorageObjects(
    @Req() req: express.Request,
    @Param('appIdentifier') appIdentifier: string,
    @Query() query: UserAppStorageListQueryParamsDTO,
  ): Promise<UserAppStorageListResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    return this.appService.listUserAppStorage(req.user, appIdentifier, {
      ...(query.prefix ? { prefix: query.prefix } : {}),
      ...(query.continuationToken
        ? { continuationToken: query.continuationToken }
        : {}),
    })
  }

  @Post('/apps/:appIdentifier/storage/presigned-urls')
  async createAppStoragePresignedUrls(
    @Req() req: express.Request,
    @Param('appIdentifier') appIdentifier: string,
    @Body() body: UserAppStoragePresignInputDTO,
  ): Promise<UserAppStoragePresignResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const urls = await this.appService.createUserAppStoragePresignedUrls(
      req.user,
      appIdentifier,
      body.requests,
    )
    return { urls }
  }

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

  // Absent keys preserved, explicit `null` deletes; writes are per-key atomic so concurrent disjoint-key patches don't race.
  @Patch('/apps/:appIdentifier/custom-settings')
  async patchUserCustomSettings(
    @Req() req: express.Request,
    @Param('appIdentifier') appIdentifier: string,
    @Body() body: AppCustomSettingsPatchInputDTO,
  ): Promise<AppCustomSettingsGetResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const app = await this.appCustomSettingsService.getAppOrThrow(appIdentifier)
    const result = await this.appCustomSettingsService.patchUserCustomSettings(
      req.user.id,
      app,
      body.values,
    )
    return { settings: result }
  }

  // Revert the user's custom settings to defaults.
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
