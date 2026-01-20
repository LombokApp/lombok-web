import { patchNestjsSwagger } from '@anatine/zod-nestjs'
import { PluginMetadataPrinter } from '@nestjs/cli/lib/compiler/plugins/plugin-metadata-printer'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import type { OpenAPIObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface'
import { ReadonlyVisitor } from '@nestjs/swagger/dist/plugin'
import * as fs from 'fs'
import * as path from 'path'
import ts from 'typescript'
import { CoreModule } from 'src/core/core.module'

function findMatchingSchema(
  schema: unknown,
  schemas: Record<string, unknown>,
  excludeKey: string,
): string | undefined {
  for (const [key, candidate] of Object.entries(schemas)) {
    if (key === excludeKey) {
      continue
    }
    // Key order agnostic deep equality check not necessary
    if (JSON.stringify(schema) === JSON.stringify(candidate)) {
      return key
    }
  }
  return undefined
}

function deduplicateNestedSchemas(
  schema: unknown,
  schemas: Record<string, unknown>,
  topLevelKey: string,
  isRoot = false,
): unknown {
  if (typeof schema !== 'object' || schema == null) {
    return schema
  }
  if ((schema as Record<string, unknown>).$ref) {
    return schema
  }
  // Only deduplicate if this is not the root (top-level) schema
  if (!isRoot) {
    const match = findMatchingSchema(schema, schemas, topLevelKey)
    if (match) {
      return { $ref: `#/components/schemas/${match}` }
    }
  }
  // Recursively deduplicate nested schemas
  const result: Record<string, unknown> = {
    ...(schema as Record<string, unknown>),
  }
  if ((schema as Record<string, unknown>).properties) {
    result.properties = {}
    for (const [prop, value] of Object.entries(
      (schema as Record<string, unknown>).properties as Record<string, unknown>,
    )) {
      ;(result.properties as Record<string, unknown>)[prop] =
        deduplicateNestedSchemas(value, schemas, topLevelKey, false)
    }
  }
  if ((schema as Record<string, unknown>).items) {
    result.items = deduplicateNestedSchemas(
      (schema as Record<string, unknown>).items,
      schemas,
      topLevelKey,
      false,
    )
  }
  if ((schema as Record<string, unknown>).additionalProperties) {
    result.additionalProperties = deduplicateNestedSchemas(
      (schema as Record<string, unknown>).additionalProperties,
      schemas,
      topLevelKey,
      false,
    )
  }
  for (const key of ['oneOf', 'anyOf', 'allOf']) {
    if (Array.isArray((schema as Record<string, unknown>)[key])) {
      result[key] = ((schema as Record<string, unknown>)[key] as unknown[]).map(
        (item) => deduplicateNestedSchemas(item, schemas, topLevelKey, false),
      )
    }
  }
  return result
}

function compressOpenApiDocument(document: OpenAPIObject) {
  const schemas = document.components?.schemas || {}
  const dedupedSchemas: Record<string, unknown> = {}
  for (const [key, schema] of Object.entries(schemas)) {
    // Do not deduplicate the top-level schema itself, only its children
    dedupedSchemas[key] = deduplicateNestedSchemas(schema, schemas, key, true)
  }
  return {
    ...document,
    components: {
      ...document.components,
      schemas: dedupedSchemas,
    },
  }
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..')
  const tsconfigPath = path.join(projectRoot, 'tsconfig-generate-metadata.json')
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
  if (configFile.error) {
    throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'))
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    projectRoot,
  )
  if (parsedConfig.errors.length > 0) {
    const formatDiagnosticsHost = {
      getCanonicalFileName: (filePath: string) => filePath,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getNewLine: () => ts.sys.newLine,
    }
    const message = ts.formatDiagnosticsWithColorAndContext(
      parsedConfig.errors,
      formatDiagnosticsHost,
    )
    throw new Error(message)
  }

  const program = ts.createProgram(parsedConfig.fileNames, {
    ...parsedConfig.options,
    incremental: false,
    tsBuildInfoFile: undefined,
  })
  const diagnostics = ts.getPreEmitDiagnostics(program)
  if (diagnostics.length > 0) {
    const formatDiagnosticsHost = {
      getCanonicalFileName: (filePath: string) => filePath,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getNewLine: () => ts.sys.newLine,
    }
    const message = ts.formatDiagnosticsWithColorAndContext(
      diagnostics,
      formatDiagnosticsHost,
    )
    throw new Error(message)
  }

  const app = await NestFactory.create(CoreModule, { preview: true })

  const visitor = new ReadonlyVisitor({
    introspectComments: true,
    pathToSource: path.join(projectRoot, 'src'),
    classValidatorShim: false,
  })

  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      visitor.visit(program, sourceFile)
    }
  }

  const printer = new PluginMetadataPrinter()
  const pluginMetadata = {
    [visitor.key]: visitor.collect(),
  } as unknown as Parameters<PluginMetadataPrinter['print']>[0]
  const typeImports =
    visitor.typeImports as unknown as Parameters<
      PluginMetadataPrinter['print']
    >[1]

  printer.print(
    pluginMetadata,
    typeImports,
    {
      outputDir: __dirname,
      filename: '../src/nestjs-metadata.ts',
    },
    ts as unknown as Parameters<PluginMetadataPrinter['print']>[3],
  )

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access
  const metadata = require('../src/nestjs-metadata').default

  // necessary to integrate nestjs-zod with swagger such that
  // all the zod infered DTOs are included in the openapi spec
  patchNestjsSwagger()

  await SwaggerModule.loadPluginMetadata(
    metadata as unknown as () => Promise<Record<string, unknown>>,
  )
  const options = new DocumentBuilder()
    .setOpenAPIVersion('3.1.0')
    .setTitle('@lombokapp/api')
    .setDescription('The Lombok core API')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const uncompressedDocument = SwaggerModule.createDocument(app, options, {
    operationIdFactory: (_controllerKey: string, methodKey: string) =>
      methodKey,
  })

  // Where possible, replace nested inline duplicate object definitions with references to the top-level definitions
  const document = compressOpenApiDocument(uncompressedDocument)

  const stringifiedDocument = JSON.stringify(document, null, 2)

  fs.writeFileSync(
    path.join(__dirname, '..', 'src', './openapi.json'),
    stringifiedDocument,
  )

  // eslint-disable-next-line no-console
  console.log('Generated OpenAPI spec:', stringifiedDocument)
}

void main()
