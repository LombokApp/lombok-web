import { container } from 'tsyringe'

import { EnvConfigProvider } from '../config/env-config.provider'
import { LoggingService } from '../services/logging.service'
import { getConfig } from './orm.config'

export default getConfig(
  container.resolve(EnvConfigProvider),
  container.resolve(LoggingService),
)
