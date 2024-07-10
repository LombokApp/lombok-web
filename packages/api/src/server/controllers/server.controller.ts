import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import express from 'express'
import { AuthGuard } from 'src/auth/guards/auth.guard'

import { SettingSetResponse } from '../dto/responses/setting-set-response.dto'
import { SettingsGetResponse } from '../dto/responses/settings-get-response.dto'
import { SetSettingInputDTO } from '../dto/set-setting-input.dto'
import { ServerConfigurationService } from '../services/server-configuration.service'

@Controller('/server')
@ApiTags('Server')
@UsePipes(ZodValidationPipe)
@UseGuards(AuthGuard)
export class ServerController {
  constructor(
    private readonly serverConfigurationService: ServerConfigurationService,
  ) {}

  /**
   * Get the server settings object.
   */
  @Get('/settings')
  async getServerSettings(
    @Req() req: express.Request,
  ): Promise<SettingsGetResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    try {
      return {
        settings: await this.serverConfigurationService.getServerSettingsAsUser(
          req.user,
        ),
      }
    } catch (e) {
      console.log('getServerSettings ERROR:', e)
      throw e
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
    await this.serverConfigurationService.setServerSettingAsUser(
      req.user,
      settingKey,
      settingValue.value,
    )
    return {
      key: settingKey,
      value: settingValue.value,
    }
  }
}
