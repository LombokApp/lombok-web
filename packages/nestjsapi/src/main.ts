import { NestFactory } from '@nestjs/core'

import { CoreModule } from './core/core.module'

async function bootstrap() {
  const app = await NestFactory.create(CoreModule)
  await app.listen(3001)
}

void bootstrap()
