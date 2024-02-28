import { Controller, Get } from '@nestjs/common'
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger'

import { AppService } from './app.service'
import { type AppInfoDTO } from './app-info.dto'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/')
  @ApiExtraModels(() => AppInfoDTO)
  @ApiResponse({
    status: 200,
    description: 'The app info.',
    type: getSchemaPath(AppInfoDTO),
  })
  getAppInfo(): AppInfoDTO {
    return this.appService.getAppInfo()
  }
}
