import { PluginMetadataGenerator } from '@nestjs/cli/lib/compiler/plugins'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { ReadonlyVisitor } from '@nestjs/swagger/dist/plugin'
import fs from 'fs'
import path from 'path'

import { AppModule } from './app.module'

const generator = new PluginMetadataGenerator()

async function main() {
  const app = await NestFactory.create(AppModule)

  const options = new DocumentBuilder()
    .setTitle('@stellariscloud/api')
    .setDescription('The Stellaris Cloud core API')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, options)

  fs.writeFileSync(
    path.join(__dirname, './openapi.json'),
    JSON.stringify(document, null, 2),
  )

  console.log('Generated OpenAPI spec:', JSON.stringify(document, null, 2))

  generator.generate({
    visitors: [
      new ReadonlyVisitor({
        introspectComments: true,
        pathToSource: __dirname,
        classValidatorShim: false,
        debug: true,
      }),
    ],
    outputDir: __dirname,
    printDiagnostics: true,
    tsconfigPath: 'tsconfig.json',
    filename: 'generated-metadata.ts',
  })
}

void main()
