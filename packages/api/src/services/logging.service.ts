import type { Handler, NextFunction, Request, Response } from 'express'
import expressWinston from 'express-winston'
import LogDNATransport from 'logdna-winston'
import { singleton } from 'tsyringe'
import winston from 'winston'

import { EnvConfigProvider } from '../config/env-config.provider'
import { LOG_LEVELS } from '../constants/logging.constants'
import { isLoggableError, parseLoggableError } from '../errors/loggable.error'

@singleton()
export class LoggingService {
  loggedErrors = new WeakSet<Object>()
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
          app: 'stellariscloud-api',
          // handleExceptions: true,
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

  requestHandler() {
    return expressWinston.logger({
      level: 'info',
      format: winston.format.json(),
      winstonInstance: this.logger,
      dynamicMeta: (req: Request) => ({
        ip: req.headers['x-nf-client-connection-ip'],
      }),
      ignoreRoute: (req: { path: string }) =>
        ['/api/health', '/api/v1/health'].includes(req.path) ||
        req.path.startsWith('/arena'),
      meta: true,
      msg: 'HTTP {{req.method}} {{req.url}}',
      expressFormat: true,
      colorize: false,
    }) as Handler
  }

  handleError(error: unknown) {
    if (this.loggedErrors.has(error as Object)) {
      return
    }

    try {
      this.loggedErrors.add(error as Object)
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

  errorHandler() {
    return (
      error: unknown,
      req: Request,
      res: Response,
      next: NextFunction,
    ) => {
      if (isLoggableError(error)) {
        this.handleError(error)
      }

      next(error)
    }
  }
}
