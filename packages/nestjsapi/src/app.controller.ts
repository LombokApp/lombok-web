import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { AppService } from './app.service'

@Controller()
@ApiTags('App')
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * The app info.
   */
  @Get('/')
  getAppInfo() {
    return this.appService.getAppInfo()
  }
}
