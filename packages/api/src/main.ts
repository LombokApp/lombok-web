import { NestFactory } from '@nestjs/core'

import { CoreModule } from './core/core.module'
import { appReference, setApp, setAppInitializing } from './shared/app-helper'
import { HttpExceptionFilter } from './shared/http-exception-filter'

export async function buildApp() {
  if (appReference.app) {
    return appReference.app
  }
  const creationPromise = NestFactory.create(CoreModule)
  // set the app init promise reference
  setAppInitializing(creationPromise)

  // await the promise and set the app reference itself
  const app = await creationPromise
  setApp(app)

  // set other app configs
  app.useGlobalFilters(new HttpExceptionFilter())
  app.enableShutdownHooks()
  app.enableCors()

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return app.listen(3001)
}

void buildApp()
