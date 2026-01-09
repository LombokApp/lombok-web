import { NestFactory } from '@nestjs/core'
import crypto from 'crypto'

import { CoreModule } from './core/core.module'
import { appReference, setApp, setAppInitializing } from './shared/app-helper'
import { HttpExceptionFilter } from './shared/http-exception-filter'
import { NoPrefixConsoleLogger } from './shared/no-prefix-console-logger'
import { runWithThreadContext } from './shared/thread-context'

export async function buildApp() {
  if (appReference.app) {
    return appReference.app
  }
  const logger = new NoPrefixConsoleLogger({
    colors: true,
    timestamp: true,
    // json: true,
    logLevels:
      process.env.LOG_LEVEL === 'ALL'
        ? ['log', 'error', 'warn', 'debug', 'fatal', 'verbose']
        : process.env.LOG_LEVEL === 'DEBUG'
          ? ['log', 'error', 'warn', 'fatal', 'debug']
          : ['log', 'error', 'warn', 'fatal'],
  })
  const creationPromise = NestFactory.create(CoreModule, {
    logger,
  })
  // set the app init promise reference
  setAppInitializing(creationPromise)

  // await the promise and set the app reference itself
  const app = await creationPromise
  setApp(app)

  // set other app configs
  app.useGlobalFilters(new HttpExceptionFilter())
  app.enableShutdownHooks()
  app.enableCors()
  app.use((req, _res, next) => {
    const requestId = crypto.randomUUID()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    runWithThreadContext(requestId, next)
  })

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const httpServer = await app.listen(3000, '0.0.0.0', () => {
    logger.log('API started and listening on port 3000', 'Bootstrap')
  })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return httpServer
}

void buildApp()
