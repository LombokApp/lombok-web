import { NestFactory } from '@nestjs/core'

import { CoreModule } from './core/core.module'
import { HttpExceptionFilter } from './core/http-exception-filter'

async function bootstrap() {
  const app = await NestFactory.create(CoreModule)

  app.useGlobalFilters(new HttpExceptionFilter())

  app.enableShutdownHooks()

  await app.listen(3001)

  return app
}

const appPromise = bootstrap()

export async function getApp() {
  return appPromise
}
