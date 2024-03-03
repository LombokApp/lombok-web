import { PluginMetadataGenerator } from '@nestjs/cli/lib/compiler/plugins'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { ReadonlyVisitor } from '@nestjs/swagger/dist/plugin'
import * as fs from 'fs'
import * as path from 'path'
import { CoreModule } from 'src/core/core.module'

const generator = new PluginMetadataGenerator()

async function main() {
  const app = await NestFactory.create(CoreModule, { preview: true })

  generator.generate({
    visitors: [
      new ReadonlyVisitor({
        introspectComments: true,
        pathToSource: __dirname,
        classValidatorShim: false,
      }),
    ],
    outputDir: __dirname,
    printDiagnostics: true,
    tsconfigPath: 'tsconfig.json',
    filename: '../src/nestjs-metadata.ts',
  })

  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const metadata = require('../src/nestjs-metadata').default

  await SwaggerModule.loadPluginMetadata(
    metadata as unknown as () => Promise<Record<string, any>>,
  )

  const options = new DocumentBuilder()
    .setTitle('@stellariscloud/api')
    .setDescription('The Stellaris Cloud core API')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, options, {
    operationIdFactory: (_controllerKey: string, methodKey: string) =>
      methodKey,
  })

  console.log('document:', JSON.stringify(document, null, 2))

  fs.writeFileSync(
    path.join(__dirname, '..', 'src', './openapi.json'),
    JSON.stringify(document, null, 2),
  )

  console.log('Generated OpenAPI spec:', JSON.stringify(document, null, 2))
}

void main()
