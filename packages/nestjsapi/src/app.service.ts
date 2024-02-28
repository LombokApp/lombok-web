import { Injectable } from '@nestjs/common'

import type { AppInfoDTO } from './app-info.dto'

@Injectable()
export class AppService {
  getAppInfo(): AppInfoDTO {
    return { version: '1.0.0' }
  }
}
