import LogDNATransport from 'logdna-winston'
import { singleton } from 'tsyringe'
import winston from 'winston'

import { EnvConfigProvider } from '../config/env-config.provider'
import { LOG_LEVELS } from '../constants/logging.constants'
import { parseLoggableError } from '../errors/loggable.error'

@singleton()
export class LoggingService {
  loggedErrors = new WeakSet<NonNullable<unknown>>()
  logger: winston.Logger

  constructor(configProvider: EnvConfigProvider) {
    const { logDnaKey, level, logDnaEnv } = configProvider.getLoggingConfig()
    // const { host } = configProvider.getApiConfig();

    const transports: winston.transport[] = []

    if (logDnaKey) {
      transports.push(
        new LogDNATransport({
          key: logDnaKey,
          indexMeta: true,
          env: logDnaEnv,
          app: 'stellariscloud-worker',
        }),
      )
    } else {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(winston.format.cli()),
          handleExceptions: true,
        }),
      )
    }

    this.logger = winston.createLogger({
      levels: LOG_LEVELS,
      level,
      format: winston.format.combine(
        winston.format.errors(),
        winston.format.json(),
      ),
      transports,
    })
  }

  handleError(error: unknown) {
    if (this.loggedErrors.has(error as NonNullable<unknown>)) {
      return
    }

    try {
      this.loggedErrors.add(error as NonNullable<unknown>)
    } catch {
      // Ignore 'Invalid value used in weak set' error
    }

    const entry = parseLoggableError(error)

    if (entry) {
      this.logger.log(entry)
    } else {
      this.logger.error(error)
    }
  }
}
