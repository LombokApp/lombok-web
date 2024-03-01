import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { CoreService } from './core.service'

@Controller()
@ApiTags('App')
export class AppController {
  constructor(private readonly appService: CoreService) {}

  /**
   * The app info.
   */
  @Get('/')
  getAppInfo() {
    return this.appService.getAppInfo()
  }
}
