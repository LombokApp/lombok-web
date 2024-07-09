import { ZodValidationPipe } from '@anatine/zod-nestjs'
import { Controller, Get, Param, Put, UsePipes } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { User } from 'src/users/entities/user.entity'

import { ServerConfigurationService } from '../services/server-configuration.service'

@Controller('/server')
@ApiTags('Server')
@UsePipes(ZodValidationPipe)
export class ServerController {
  constructor(
    private readonly serverConfigurationService: ServerConfigurationService,
  ) {}
  /**
   * Get the server settings object.
   */
  @Get('/settings')
  getServerSettings() {
    return this.serverConfigurationService.getServerSettingsAsUser(
      {} as unknown as User,
    )
  }

  /**
   * Set a setting in the server settings objects.
   */
  @Put('/settings/:settingKey')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setServerSetting(@Param() settingKey: string, settingValue: any) {
    return this.serverConfigurationService.setServerSettingAsUser(
      {} as unknown as User,
      '',
      '',
    )
  }
}
