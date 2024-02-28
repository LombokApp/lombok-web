import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const options = new DocumentBuilder()
    .setTitle('@stellariscloud/api')
    .setDescription('The Stellaris Cloud core API')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, options)

  console.log('Serving OpenAPI spec:', document)

  SwaggerModule.setup('api', app, document)

  await app.listen(3001)
}

void bootstrap()
