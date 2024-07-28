import { NestFactory } from '@nestjs/core'

import { redisConfig } from './cache/redis.config'
import { RedisService } from './cache/redis.service'
import { appReference, setApp, setAppInitializing } from './core/app-helper'
import { CoreModule } from './core/core.module'
import { HttpExceptionFilter } from './core/http-exception-filter'
import { RedisIoAdapter } from './socket/redis-io-adapter'

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

  // setup redis adapter for socket.io broadcasts
  const _redisConfig = redisConfig()
  if (_redisConfig.enabled) {
    const redisIoAdapter = new RedisIoAdapter(
      _redisConfig,
      await app.resolve(RedisService),
    )
    redisIoAdapter.connectAdapter()
    app.useWebSocketAdapter(redisIoAdapter)
  }

  return app.listen(3001)
}

void buildApp()
