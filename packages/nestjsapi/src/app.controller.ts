import { Controller, Get } from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'

import { AppService } from './app.service'
import { AppInfoDTO } from './app-info.dto'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/')
  @ApiResponse({
    status: 200,
    description: 'The app info.',
    type: AppInfoDTO,
  })
  getAppInfo() {
    return this.appService.getAppInfo()
  }
}
