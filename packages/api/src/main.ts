import { NestFactory } from '@nestjs/core'

import { PlatformModule } from './platform/platform.module'
import { appReference, setApp, setAppInitializing } from './shared/app-helper'
import { HttpExceptionFilter } from './shared/http-exception-filter'
import { NoPrefixConsoleLogger } from './shared/no-prefix-console-logger'

export async function buildApp() {
  if (appReference.app) {
    return appReference.app
  }
  const logger = new NoPrefixConsoleLogger({
    colors: true,
    timestamp: true,
    // json: true,
  })
  const creationPromise = NestFactory.create(PlatformModule, {
    logger,
  })
  // set the app init promise reference
  setAppInitializing(creationPromise)

  // await the promise and set the app reference itself
  const app = await creationPromise
  setApp(app)

  // set other app configs
  app.useGlobalFilters(new HttpExceptionFilter('DEBUG'))
  app.enableShutdownHooks()
  app.enableCors()

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const httpServer = await app.listen(3000, () => {
    logger.log('API started and listening on port 3000', 'Bootstrap')
  })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return httpServer
}

void buildApp()
