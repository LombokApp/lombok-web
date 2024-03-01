import { Injectable } from '@nestjs/common'

import type { CoreInfoDTO } from './core-info.dto'

@Injectable()
export class CoreService {
  getAppInfo(): CoreInfoDTO {
    return { version: '1.0.0' }
  }
}
