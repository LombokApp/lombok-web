import { NestFactory } from '@nestjs/core'

import { appReference, setApp, setAppInitializing } from './core/app-helper'
import { CoreModule } from './core/core.module'
import { HttpExceptionFilter } from './core/http-exception-filter'

export async function buildApp() {
  if (appReference.app) {
    return appReference.app
  }
  const app = await NestFactory.create(CoreModule)
  const creationPromise = NestFactory.create(CoreModule)
  setAppInitializing(creationPromise)

  app.useGlobalFilters(new HttpExceptionFilter())
  app.enableShutdownHooks()

  await Promise.all([
    creationPromise.then((a) => setApp(a)),
    await app.listen(3001),
  ])

  return app
}

void buildApp()
