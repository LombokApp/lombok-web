import { PluginMetadataPrinter } from '@nestjs/cli/lib/compiler/plugins/plugin-metadata-printer'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import type {
  OpenAPIObject,
  ReferenceObject,
  SchemaObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface'
import { ReadonlyVisitor } from '@nestjs/swagger/dist/plugin'
import * as fs from 'fs'
import { cleanupOpenApiDoc } from 'nestjs-zod'
import * as path from 'path'
import { CoreModule } from 'src/core/core.module'
import ts from 'typescript'
import { z } from 'zod'

// Look up a DTO class by name from loaded modules. createZodDto() stores
// the Zod schema as a static `schema` property on the class.
function findDtoZodSchema(className: string): z.ZodType | undefined {
  for (const mod of Object.values(require.cache)) {
    if (!mod?.exports) {
      continue
    }
    const exported = (mod.exports as Record<string, unknown>)[className]
    if (typeof exported === 'function' && 'schema' in exported) {
      return (exported as { schema: z.ZodType }).schema
    }
  }
  return undefined
}

// Auto-detect and patch empty schemas produced by NestJS Swagger for z.record() DTOs.
// After NestFactory.create() loads all modules, we look up DTO classes from
// require.cache and regenerate their schemas using z.toJSONSchema().
function patchEmptyRecordSchemas(document: OpenAPIObject): OpenAPIObject {
  const schemas = document.components?.schemas
  if (!schemas) {
    return document
  }

  for (const [name, schema] of Object.entries(schemas)) {
    const s = schema as Record<string, unknown>
    const props = s.properties
    if (
      s.type === 'object' &&
      typeof props === 'object' &&
      props !== null &&
      Object.keys(props).length === 0 &&
      !s.additionalProperties
    ) {
      const zodSchema = findDtoZodSchema(name)
      if (zodSchema) {
        const jsonSchema = z.toJSONSchema(zodSchema) as Record<string, unknown>
        delete jsonSchema.$schema
        schemas[name] = jsonSchema
      }
    }
  }

  return document
}

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
): SchemaObject | ReferenceObject {
  if (typeof schema !== 'object' || schema == null) {
    return schema as SchemaObject | ReferenceObject
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

// Convert standalone {"type": "null"} entries in anyOf/oneOf to type-array form
// for Swift OpenAPI Generator compatibility. Swift tooling doesn't handle
// {"type": "null"} but does handle {"type": ["string", "null"]}.
function transformNullTypes(node: unknown): void {
  if (typeof node !== 'object' || node === null) {
    return
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      transformNullTypes(item)
    }
    return
  }

  const obj = node as Record<string, unknown>

  // Recurse into children first so nested structures are handled bottom-up
  for (const value of Object.values(obj)) {
    transformNullTypes(value)
  }

  // Handle anyOf/oneOf arrays containing { "type": "null" }
  for (const compositionKey of ['anyOf', 'oneOf'] as const) {
    if (!Array.isArray(obj[compositionKey])) {
      continue
    }

    const arr = obj[compositionKey] as Record<string, unknown>[]
    const nullIdx = arr.findIndex(
      (item) => Object.keys(item).length === 1 && item.type === 'null',
    )

    if (nullIdx === -1) {
      continue
    }

    // Remove the standalone { "type": "null" } entry
    arr.splice(nullIdx, 1)

    // Find an entry with a string `type` to merge "null" into as an array
    const mergeTarget = arr.find((item) => typeof item.type === 'string')

    if (mergeTarget) {
      mergeTarget.type = [mergeTarget.type, 'null']
    } else {
      // No string type to merge into (e.g. $ref or nested oneOf) — add array form
      arr.push({ type: ['null'] })
    }

    // Unwrap single-entry anyOf/oneOf when no $ref (simplifies the schema)
    const firstEntry = arr[0]
    if (arr.length === 1 && firstEntry && !('$ref' in firstEntry)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete obj[compositionKey]
      Object.assign(obj, firstEntry)
    }
  }
}

function convertNullTypesForSwiftCompat(
  document: OpenAPIObject,
): OpenAPIObject {
  const json = JSON.parse(JSON.stringify(document)) as OpenAPIObject
  transformNullTypes(json)
  return json
}

function compressOpenApiDocument(document: OpenAPIObject): OpenAPIObject {
  const schemas = document.components?.schemas || {}
  const dedupedSchemas: Record<string, SchemaObject | ReferenceObject> = {}
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
  const configFile = ts.readConfigFile(tsconfigPath, (filePath) =>
    ts.sys.readFile(filePath),
  )
  if (configFile.error) {
    throw new Error(
      ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'),
    )
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    projectRoot,
  )
  if (parsedConfig.errors.length > 0) {
    const formatDiagnosticsHost = {
      getCanonicalFileName: (filePath: string) => filePath,
      getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
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
      getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
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
  }

  printer.print(
    pluginMetadata,
    visitor.typeImports,
    {
      outputDir: __dirname,
      filename: '../src/nestjs-metadata.ts',
    },
    ts,
  )

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access
  const metadata = require('../src/nestjs-metadata').default

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

  const rawDocument = SwaggerModule.createDocument(app, options, {
    operationIdFactory: (_controllerKey: string, methodKey: string) =>
      `${_controllerKey.replace('Controller', '')}_${methodKey}`,
  })

  // necessary to integrate nestjs-zod with swagger such that
  // all the zod infered DTOs are included in the openapi spec
  const uncompressedDocument = cleanupOpenApiDoc(rawDocument)

  // Patch z.record() DTOs that NestJS Swagger can't introspect
  const patchedDocument = patchEmptyRecordSchemas(uncompressedDocument)

  // Where possible, replace nested inline duplicate object definitions with references to the top-level definitions
  const compressedDocument = compressOpenApiDocument(patchedDocument)

  // Convert {"type": "null"} to type-array form for Swift OpenAPI Generator compat
  const document = convertNullTypesForSwiftCompat(compressedDocument)

  const stringifiedDocument = JSON.stringify(document, null, 2)

  fs.writeFileSync(
    path.join(__dirname, '..', 'src', './openapi.json'),
    stringifiedDocument,
  )

  // eslint-disable-next-line no-console
  console.log('Generated OpenAPI spec:', stringifiedDocument)
}

void main()
