import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Body,
  Controller,
  Delete,
  Get,
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
import { AppService } from 'src/app/services/app.service'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { ApiStandardErrorResponses } from 'src/platform/decorators/api-standard-error-responses.decorator'

import { InstallAppsResponse } from '../dto/responses/install-apps-response.dto'
import { ServerMetricsResponse } from '../dto/responses/server-metrics-response.dto'
import { SettingSetResponse } from '../dto/responses/setting-set-response.dto'
import { SettingsGetResponse } from '../dto/responses/settings-get-response.dto'
import { SetSettingInputDTO } from '../dto/set-setting-input.dto'
import { ServerConfigurationService } from '../services/server-configuration.service'
import { ServerMetricsService } from '../services/server-metrics.service'

@Controller('/api/v1/server')
@ApiTags('Server')
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
@UseGuards(AuthGuard)
@ApiStandardErrorResponses()
export class ServerController {
  constructor(
    private readonly serverConfigurationService: ServerConfigurationService,
    private readonly serverMetricsService: ServerMetricsService,
    private readonly appService: AppService,
  ) {}

  /**
   * Get the server settings object.
   */
  @Get('/settings')
  async getServerSettings(
    @Req() req: express.Request,
  ): Promise<SettingsGetResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    return {
      settings: await this.serverConfigurationService.getServerSettingsAsAdmin(
        req.user,
      ),
    }
  }

  /**
   * Set a setting in the server settings objects.
   */
  @Put('/settings/:settingKey')
  async setServerSetting(
    @Req() req: express.Request,
    @Param('settingKey') settingKey: string,
    @Body() settingValue: SetSettingInputDTO,
  ): Promise<SettingSetResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    await this.serverConfigurationService.setServerSettingAsAdmin(
      req.user,
      settingKey,
      settingValue.value,
    )
    return {
      settingKey,
      settingValue: settingValue.value as never,
    }
  }

  /**
   * Reset a setting in the server settings objects.
   */
  @Delete('/settings/:settingKey')
  async resetServerSetting(
    @Req() req: express.Request,
    @Param('settingKey') settingKey: string,
  ): Promise<SettingSetResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    await this.serverConfigurationService.resetServerSettingAsUser(
      req.user,
      settingKey,
    )
    const newSettings =
      await this.serverConfigurationService.getServerSettingsAsAdmin(req.user)

    return { settingKey, settingValue: newSettings[settingKey] as never }
  }

  /**
   * Install all apps from disk.
   */
  @Post('/install-local-apps')
  async installLocalApps(
    @Req() req: express.Request,
  ): Promise<InstallAppsResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    await this.appService.installAllAppsFromDisk()
    return {
      message: 'Apps installation completed',
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Get server metrics including user counts, folder counts, and storage statistics.
   */
  @Get('/metrics')
  async getServerMetrics(
    @Req() req: express.Request,
  ): Promise<ServerMetricsResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    return this.serverMetricsService.getServerMetrics(req.user)
  }
}
