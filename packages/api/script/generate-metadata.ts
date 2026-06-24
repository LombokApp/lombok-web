import { PluginMetadataPrinter } from '@nestjs/cli/lib/compiler/plugins/plugin-metadata-printer'
import { NestFactory } from '@nestjs/core'
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger'
import * as fs from 'fs'
import { cleanupOpenApiDoc } from 'nestjs-zod'
import * as path from 'path'
import { CoreModule } from 'src/core/core.module'
import ts from 'typescript'
import { z } from 'zod'

// SchemaObject / ReferenceObject aren't re-exported from @nestjs/swagger's public
// entry, so derive them from the public OpenAPIObject rather than deep-importing
// dist/ (which bundler resolution blocks via the package exports map).
type SchemaOrReference = NonNullable<
  NonNullable<NonNullable<OpenAPIObject['components']>['schemas']>[string]
>
type ReferenceObject = Extract<SchemaOrReference, { $ref: string }>
type SchemaObject = Exclude<SchemaOrReference, ReferenceObject>

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

// Strip the top-level `id` field nestjs-zod adds to schemas registered via
// Zod's `.meta({ id })` — the name is already conveyed by the entry's key in
// components.schemas, so the duplicate `id` annotation just adds noise.
function stripSchemaIdAnnotations(document: OpenAPIObject): OpenAPIObject {
  const schemas = document.components?.schemas
  if (!schemas) {
    return document
  }
  const newSchemas: Record<string, SchemaObject | ReferenceObject> = {}
  for (const [name, schema] of Object.entries(schemas)) {
    if (typeof schema === 'object' && 'id' in schema) {
      const { id: _id, ...rest } = schema
      newSchemas[name] = rest
    } else {
      newSchemas[name] = schema
    }
  }
  return {
    ...document,
    components: { ...document.components, schemas: newSchemas },
  }
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

// FNV-1a 32-bit hash → 8 hex chars. Deterministic content-addressed string
// used both for naming hash-derived schema entries and for keeping structural
// fingerprints bounded across refinement iterations.
function hashCanonical(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

// Stable JSON serialization with sorted object keys, so two schemas with the same
// content but different key order hash identically.
function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJSON).join(',') + ']'
  }
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return (
    '{' +
    keys.map((k) => JSON.stringify(k) + ':' + canonicalJSON(obj[k])).join(',') +
    '}'
  )
}

// Recursively rewrite every $ref to a top-level schema that appears in the
// rename map. Operates on any node in the doc tree (paths, schemas, etc.).
function rewriteAllRefs(node: unknown, rename: Map<string, string>): unknown {
  if (node === null || typeof node !== 'object') {
    return node
  }
  if (Array.isArray(node)) {
    return node.map((item) => rewriteAllRefs(item, rename))
  }
  const obj = node as Record<string, unknown>
  if (typeof obj.$ref === 'string') {
    const prefix = '#/components/schemas/'
    if (obj.$ref.startsWith(prefix)) {
      const name = obj.$ref.slice(prefix.length)
      const target = rename.get(name)
      if (target !== undefined) {
        return { ...obj, $ref: prefix + target }
      }
    }
    return obj
  }
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    result[k] = rewriteAllRefs(v, rename)
  }
  return result
}

// nestjs-zod's cleanupOpenApiDoc extracts a *per-DTO* copy of every recursive
// `.meta({ id })` schema used in multiple DTOs, naming each copy `<DTOName><Id>`
// (e.g. `AppGetResponseJsonSerializableValue`) instead of sharing a single `<Id>`
// entry. This fragments the spec into dozens of byte-identical copies — no
// behavioural change (openapi-typescript inlines them identically, so the emitted
// api-paths.d.ts is unaffected), but a large, noisy diff on every regeneration.
//
// Collapse each `<prefix><Id>` copy back into one shared `<Id>`, where `<Id>` is an
// authoritative schema id from the Zod global registry. The longest matching id
// wins so `<…>PgSafeJsonSerializableValue` collapses to `PgSafeJsonSerializableValue`,
// not `JsonSerializableValue`. Matching only against registered ids (the exact
// names nestjs-zod suffixes its per-DTO copies with) keeps real DTOs untouched;
// the generated api-paths.d.ts is invariant under this pass, which is the guardrail
// that a collapse never alters a public type.
function collapseRegisteredIdCopies(
  document: OpenAPIObject,
  registeredIds: Set<string>,
): OpenAPIObject {
  const schemas = document.components?.schemas
  if (!schemas) {
    return document
  }
  const idsLongestFirst = [...registeredIds].sort((a, b) => b.length - a.length)
  const rename = new Map<string, string>()
  for (const name of Object.keys(schemas)) {
    if (registeredIds.has(name)) {
      continue
    }
    const id = idsLongestFirst.find(
      (candidate) => name.length > candidate.length && name.endsWith(candidate),
    )
    if (id !== undefined) {
      rename.set(name, id)
    }
  }
  if (rename.size === 0) {
    return document
  }
  const rewritten = rewriteAllRefs(document, rename) as OpenAPIObject
  const rewrittenSchemas = rewritten.components?.schemas ?? {}
  const newSchemas: Record<string, SchemaObject | ReferenceObject> = {}
  for (const [name, schema] of Object.entries(rewrittenSchemas)) {
    const target = rename.get(name)
    if (target === undefined) {
      newSchemas[name] = schema
    } else if (newSchemas[target] === undefined) {
      // First copy for this id becomes the shared entry; its internal self-refs
      // were just rewritten by rewriteAllRefs to point at `target`.
      newSchemas[target] = schema
    }
  }
  return {
    ...rewritten,
    components: { ...rewritten.components, schemas: newSchemas },
  }
}

// The recursive JSON-value schemas (`JsonSerializableValue` /
// `PgSafeJsonSerializableValue`) self-`$ref` to model arbitrary JSON. That is
// faithful, but `openapi-fetch@0.17`'s `Writable<T>` is a recursive mapped type
// that degenerates when applied to a self-referential body type, collapsing
// every request body typed `Record<string, JsonSerializableValue>` to the
// unsatisfiable `{ [x: string]: any } & { [x: string]: undefined }`. Cut the
// recursion in the *generated client types only* by replacing each self-`$ref`
// with an open schema (`{}` → `unknown`); the union shape is preserved, so the
// type stays `(string|null)|number|boolean|unknown[]|{ [k]:unknown }`. Server
// Zod schemas are untouched (they come from Zod, not the spec), so nothing
// ripples into server types. Must run AFTER collapseRegisteredIdCopies, when the
// bare `<Id>` components exist (earlier they are per-DTO-prefixed copies).
function breakRecursiveJsonValueSchemas(
  document: OpenAPIObject,
): OpenAPIObject {
  const schemas = document.components?.schemas
  if (!schemas) {
    return document
  }
  const newSchemas: Record<string, SchemaObject | ReferenceObject> = {
    ...schemas,
  }
  for (const name of ['JsonSerializableValue', 'PgSafeJsonSerializableValue']) {
    const schema = schemas[name]
    if (!schema) {
      continue
    }
    const selfRef = `#/components/schemas/${name}`
    const stripSelfRef = (node: unknown): unknown => {
      if (Array.isArray(node)) {
        return node.map(stripSelfRef)
      }
      if (node !== null && typeof node === 'object') {
        const obj = node as Record<string, unknown>
        if (obj.$ref === selfRef) {
          return {}
        }
        return Object.fromEntries(
          Object.entries(obj).map(([k, v]) => [k, stripSelfRef(v)]),
        )
      }
      return node
    }
    newSchemas[name] = stripSelfRef(schema) as SchemaObject
  }
  return {
    ...document,
    components: { ...document.components, schemas: newSchemas },
  }
}

// nestjs-zod's cleanupOpenApiDoc hoists Zod `$defs` into components.schemas and
// rewrites refs to them — but its rewriter skips tuple `prefixItems`, leaving
// dangling `#/$defs/X` refs inside tuples. Rewrite any such ref to the hoisted
// component when one exists. Runs right after cleanup so downstream passes see
// uniform `#/components/schemas/` refs. No-op when no `$defs` refs survive.
function rewriteDefsRefsToComponents(document: OpenAPIObject): OpenAPIObject {
  const componentNames = new Set(
    Object.keys(document.components?.schemas ?? {}),
  )
  const prefix = '#/$defs/'
  const walk = (node: unknown): unknown => {
    if (node === null || typeof node !== 'object') {
      return node
    }
    if (Array.isArray(node)) {
      return node.map(walk)
    }
    const obj = node as Record<string, unknown>
    if (typeof obj.$ref === 'string' && obj.$ref.startsWith(prefix)) {
      const name = obj.$ref.slice(prefix.length)
      if (componentNames.has(name)) {
        return { ...obj, $ref: `#/components/schemas/${name}` }
      }
      return obj
    }
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      result[k] = walk(v)
    }
    return result
  }
  return walk(document) as OpenAPIObject
}

// Compute a structural fingerprint of a schema by replacing every $ref to a
// top-level component with the current (hashed) fingerprint of its target,
// then hashing the resulting canonical JSON. Two schemas produce the same
// fingerprint exactly when they're structurally equivalent under any
// consistent renaming of $ref anchors — i.e. genuine isomorphism across the
// recursive schema graph. The hash keeps fingerprints fixed-size so they
// don't grow exponentially across refinement iterations.
function computeStructuralFingerprint(
  schema: unknown,
  fingerprints: Map<string, string>,
): string {
  const normalize = (node: unknown): unknown => {
    if (node === null || typeof node !== 'object') {
      return node
    }
    if (Array.isArray(node)) {
      return node.map(normalize)
    }
    const obj = node as Record<string, unknown>
    if (typeof obj.$ref === 'string') {
      const prefix = '#/components/schemas/'
      if (obj.$ref.startsWith(prefix)) {
        const refName = obj.$ref.slice(prefix.length)
        const fp = fingerprints.get(refName)
        if (fp !== undefined) {
          return { __fp__: fp }
        }
      }
      return obj
    }
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      result[k] = normalize(v)
    }
    return result
  }
  return hashCanonical(canonicalJSON(normalize(schema)))
}

// Pick a canonical name for an equivalence group. When every member is one of
// nestjs-zod's auto-extracted `<DTO>__schema<N>` artifacts, derive a name that
// doesn't carry a misleading DTO prefix: `Schema<N>` if the suffix is uniform
// (intent-preserving), otherwise `Schema_<fingerprint>` (content-addressed).
// Otherwise fall back to the alphabetically smallest member for stability.
function chooseGroupCanonicalName(
  group: string[],
  fingerprint: string,
  reserved: Set<string>,
): string {
  const sorted = [...group].sort()
  const allExtracted = sorted.every((name) => /__schema\d+$/.test(name))
  if (allExtracted) {
    const suffixes = new Set(
      sorted.map((name) => name.match(/__schema(\d+)$/)?.[1] ?? ''),
    )
    const base =
      suffixes.size === 1
        ? 'Schema' + [...suffixes][0]
        : 'Schema_' + fingerprint
    let candidate = base
    let i = 2
    while (reserved.has(candidate)) {
      candidate = base + '_' + String(i)
      i++
    }
    return candidate
  }
  const first = sorted[0]
  if (first === undefined) {
    throw new Error('chooseGroupCanonicalName: empty group')
  }
  return first
}

// Collapse structurally-equivalent top-level schemas that differ only by the
// names of their $ref anchors. nestjs-zod's cleanupOpenApiDoc emits a separate
// extracted copy of each recursive subschema (e.g. <DTO>__schema0/1/2) per
// containing DTO, even when those subschemas come from the same Zod source —
// fragmenting what should be one shared shape into N near-duplicates. This pass
// detects the equivalence via iterative structural fingerprinting and merges
// each class under a single canonical name, so the downstream hoist pass sees
// matching canonical JSON and can dedupe the inline copies that reference them.
function canonicalizeRecursiveSchemas(document: OpenAPIObject): OpenAPIObject {
  if (!document.components?.schemas) {
    return document
  }
  const schemas = document.components.schemas
  const names = Object.keys(schemas)
  if (names.length === 0) {
    return document
  }

  // Iterative refinement: each pass refines fingerprints using the previous
  // round's values for $ref targets. Converges when no fingerprint changes —
  // bounded by graph depth, so the safety bound is generous.
  let fingerprints = new Map<string, string>(names.map((n) => [n, '']))
  for (let iter = 0; iter < 100; iter++) {
    const next = new Map<string, string>()
    for (const name of names) {
      next.set(name, computeStructuralFingerprint(schemas[name], fingerprints))
    }
    let changed = false
    for (const [n, fp] of next) {
      if (fingerprints.get(n) !== fp) {
        changed = true
        break
      }
    }
    if (!changed) {
      break
    }
    fingerprints = next
  }

  const groups = new Map<string, string[]>()
  for (const [name, fp] of fingerprints) {
    let group = groups.get(fp)
    if (!group) {
      group = []
      groups.set(fp, group)
    }
    group.push(name)
  }

  // Restrict to groups where every member is an auto-extracted `<DTO>__schemaN`
  // entry. Real top-level DTO names are part of the public type surface — even
  // if two DTOs happen to share a shape, collapsing them would silently rename
  // one of the externally-visible types.
  const dupeGroups = [...groups.entries()]
    .filter(
      ([, g]) => g.length > 1 && g.every((name) => /__schema\d+$/.test(name)),
    )
    .sort(([, a], [, b]) => {
      const aFirst = [...a].sort()[0] ?? ''
      const bFirst = [...b].sort()[0] ?? ''
      return aFirst.localeCompare(bFirst)
    })
  if (dupeGroups.length === 0) {
    return document
  }

  const rename = new Map<string, string>()
  const groupCanonical = new Map<string[], string>()
  const reserved = new Set(names)
  for (const [fp, group] of dupeGroups) {
    const canonical = chooseGroupCanonicalName(group, fp, reserved)
    reserved.add(canonical)
    groupCanonical.set(group, canonical)
    for (const name of group) {
      if (name !== canonical) {
        rename.set(name, canonical)
      }
    }
  }
  if (rename.size === 0) {
    return document
  }

  const rewritten = rewriteAllRefs(document, rename) as OpenAPIObject
  const rewrittenSchemas = rewritten.components?.schemas ?? {}
  const newSchemas: Record<string, SchemaObject | ReferenceObject> = {}
  for (const [name, schema] of Object.entries(rewrittenSchemas)) {
    if (rename.has(name)) {
      continue
    }
    newSchemas[name] = schema
  }
  // For groups whose canonical name is a fresh derived name (e.g. Schema0),
  // no existing entry survived the rename — pick any class member's already-
  // rewritten schema and store it under the canonical name.
  for (const [group, canonical] of groupCanonical) {
    if (newSchemas[canonical] !== undefined) {
      continue
    }
    const sample = [...group].sort()[0]
    if (sample === undefined) {
      continue
    }
    const sampleSchema = rewrittenSchemas[sample]
    if (sampleSchema !== undefined) {
      newSchemas[canonical] = sampleSchema
    }
  }

  return {
    ...rewritten,
    components: {
      ...rewritten.components,
      schemas: newSchemas,
    },
  }
}

// JSON Schema annotation keys — non-structural metadata that doesn't affect
// the type but does affect the canonical JSON. Stripping them before hoist
// comparison merges shapes that differ only by e.g. `default({})` modifiers.
const ANNOTATION_KEYS = new Set([
  'default',
  'description',
  'title',
  'example',
  'examples',
  'readOnly',
  'writeOnly',
  'deprecated',
])

// Strip annotation-only keys recursively. Used so canonical comparison treats
// two otherwise-equivalent shapes as the same hoist target.
function stripAnnotations(node: unknown): unknown {
  if (node === null || typeof node !== 'object') {
    return node
  }
  if (Array.isArray(node)) {
    return node.map(stripAnnotations)
  }
  const obj = node as Record<string, unknown>
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (ANNOTATION_KEYS.has(k)) {
      continue
    }
    result[k] = stripAnnotations(v)
  }
  return result
}

function canonicalForDedup(value: unknown): string {
  return canonicalJSON(stripAnnotations(value))
}

// True for shapes like `anyOf: [{$ref: ...}, {type: "null"}]` (or `["null"]`),
// produced by Zod's `.nullable()` against a referenced schema. These wrappers
// add no structural information beyond "X or null" — hoisting them as a named
// top-level schema just creates noise (e.g. ContainerTarget2). Better to keep
// them inline at each use site.
function isNullableRefWrapper(obj: Record<string, unknown>): boolean {
  if (!Array.isArray(obj.anyOf)) {
    return false
  }
  const arr = obj.anyOf as Record<string, unknown>[]
  if (arr.length !== 2) {
    return false
  }
  const otherKeys = Object.keys(obj).filter((k) => k !== 'anyOf')
  if (otherKeys.length > 0) {
    return false
  }
  let sawRef = false
  let sawNull = false
  for (const item of arr) {
    if (typeof item.$ref === 'string') {
      sawRef = true
    } else if (
      item.type === 'null' ||
      (Array.isArray(item.type) &&
        item.type.length === 1 &&
        item.type[0] === 'null')
    ) {
      sawNull = true
    } else {
      return false
    }
  }
  return sawRef && sawNull
}

function isTrivialSchemaShape(obj: Record<string, unknown>): boolean {
  const properties = obj.properties
  const hasProperties =
    properties !== null &&
    typeof properties === 'object' &&
    Object.keys(properties).length > 0
  const hasOneOf = Array.isArray(obj.oneOf) && obj.oneOf.length > 0
  const hasAnyOf = Array.isArray(obj.anyOf) && obj.anyOf.length > 0
  const hasAllOf = Array.isArray(obj.allOf) && obj.allOf.length > 0
  const items = obj.items
  const hasInterestingItems =
    items !== null &&
    typeof items === 'object' &&
    !Array.isArray(items) &&
    Object.keys(items).length > 0
  return (
    !hasProperties &&
    !hasOneOf &&
    !hasAnyOf &&
    !hasAllOf &&
    !hasInterestingItems
  )
}

// True for `X[]` (or `X[] | null`) whose element X is either a bare $ref to an
// already-named schema or a primitive scalar. The hoist pass would otherwise
// lift these trivial wrappers to a named top-level schema and label them after
// a containing property — producing misleading indirections like `Folder3`
// (= FolderScopeAppPermission[]) or, worse, `User` (= UserScopeAppPermission[]),
// which then forces the genuine user object to fall back to `User2`. Inlining
// `X[]` at each use site is clearer than a named wrapper, and keeping these out
// of the candidate set frees the property-derived names for the real object
// schemas that deserve them. Mirrors isNullableRefWrapper.
function isTrivialArrayWrapper(obj: Record<string, unknown>): boolean {
  const t = obj.type
  const isArray = t === 'array' || (Array.isArray(t) && t.includes('array'))
  if (!isArray) {
    return false
  }
  const items = obj.items
  if (items === null || typeof items !== 'object' || Array.isArray(items)) {
    return false
  }
  const itemObj = items as Record<string, unknown>
  const keys = Object.keys(itemObj)
  // Element is a bare $ref — the named schema it points at carries the meaning.
  if (keys.length === 1 && keys[0] === '$ref') {
    return true
  }
  // Element is a primitive scalar, possibly with enum/format/pattern/min/max
  // constraints, but no nested object/array/$ref/composition worth naming.
  const itemType = itemObj.type
  const isPrimitive =
    itemType === 'string' ||
    itemType === 'number' ||
    itemType === 'integer' ||
    itemType === 'boolean'
  const hasNestedStructure =
    'properties' in itemObj ||
    'items' in itemObj ||
    '$ref' in itemObj ||
    'oneOf' in itemObj ||
    'anyOf' in itemObj ||
    'allOf' in itemObj
  return isPrimitive && !hasNestedStructure
}

function walkForOccurrences(
  node: unknown,
  parentPropName: string | null,
  isRoot: boolean,
  occurrences: Map<
    string,
    { count: number; propNames: string[]; sample: unknown }
  >,
): void {
  if (typeof node !== 'object' || node === null) {
    return
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      walkForOccurrences(item, null, false, occurrences)
    }
    return
  }
  const obj = node as Record<string, unknown>
  if ('$ref' in obj) {
    return
  }

  if (
    !isRoot &&
    !isTrivialSchemaShape(obj) &&
    !isNullableRefWrapper(obj) &&
    !isTrivialArrayWrapper(obj)
  ) {
    const canonical = canonicalForDedup(obj)
    const info = occurrences.get(canonical) ?? {
      count: 0,
      propNames: [],
      sample: obj,
    }
    info.count += 1
    if (parentPropName !== null) {
      info.propNames.push(parentPropName)
    }
    occurrences.set(canonical, info)
  }

  if (obj.properties && typeof obj.properties === 'object') {
    for (const [k, v] of Object.entries(
      obj.properties as Record<string, unknown>,
    )) {
      walkForOccurrences(v, k, false, occurrences)
    }
  }
  if ('items' in obj) {
    walkForOccurrences(obj.items, null, false, occurrences)
  }
  if (
    'additionalProperties' in obj &&
    typeof obj.additionalProperties === 'object'
  ) {
    walkForOccurrences(obj.additionalProperties, null, false, occurrences)
  }
  if ('propertyNames' in obj && typeof obj.propertyNames === 'object') {
    walkForOccurrences(obj.propertyNames, null, false, occurrences)
  }
  for (const k of ['oneOf', 'anyOf', 'allOf'] as const) {
    if (Array.isArray(obj[k])) {
      for (const item of obj[k] as unknown[]) {
        walkForOccurrences(item, null, false, occurrences)
      }
    }
  }
  if ('not' in obj) {
    walkForOccurrences(obj.not, null, false, occurrences)
  }
}

function pascalCase(s: string): string {
  return s
    .replace(/[_-]([a-z])/gi, (_, c: string) => c.toUpperCase())
    .replace(/^([a-z])/, (_, c: string) => c.toUpperCase())
    .replace(/[_-]/g, '')
}

// FNV-1a 32-bit hash → 8 hex chars. Deterministic content-addressed fallback name.
// Minimum canonical length to consider a subtree worth hoisting. Below this
// size, the $ref overhead approaches the savings and the named entry adds
// more noise than value. Slightly stricter for anonymous (hash) names since
// they carry no semantic value.
const MIN_PROPERTY_HOIST_LENGTH = 50
const MIN_ANONYMOUS_HOIST_LENGTH = 80

function disambiguate(base: string, taken: Set<string>): string {
  if (!taken.has(base)) {
    return base
  }
  let i = 2
  while (taken.has(base + String(i))) {
    i++
  }
  return base + String(i)
}

function deriveSchemaName(
  propNames: string[],
  canonical: string,
  taken: Set<string>,
): string | undefined {
  if (propNames.length > 0 && canonical.length >= MIN_PROPERTY_HOIST_LENGTH) {
    const counts = new Map<string, number>()
    for (const n of propNames) {
      counts.set(n, (counts.get(n) ?? 0) + 1)
    }
    const sorted = [...counts.entries()].sort(
      ([a, ac], [b, bc]) => bc - ac || a.localeCompare(b),
    )
    const topEntry = sorted[0]
    if (topEntry) {
      return disambiguate(pascalCase(topEntry[0]), taken)
    }
  }
  if (canonical.length >= MIN_ANONYMOUS_HOIST_LENGTH) {
    return disambiguate('Schema_' + hashCanonical(canonical), taken)
  }
  return undefined
}

function rewriteSubschemas(
  node: unknown,
  hoistMap: Map<string, string>,
  isRoot: boolean,
): unknown {
  if (typeof node !== 'object' || node === null) {
    return node
  }
  if (Array.isArray(node)) {
    return node.map((item) => rewriteSubschemas(item, hoistMap, false))
  }
  const obj = node as Record<string, unknown>
  if ('$ref' in obj) {
    return obj
  }

  if (!isRoot) {
    const canonical = canonicalForDedup(obj)
    const name = hoistMap.get(canonical)
    if (name) {
      return { $ref: `#/components/schemas/${name}` }
    }
  }

  const result: Record<string, unknown> = { ...obj }
  if (obj.properties && typeof obj.properties === 'object') {
    const newProps: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(
      obj.properties as Record<string, unknown>,
    )) {
      newProps[k] = rewriteSubschemas(v, hoistMap, false)
    }
    result.properties = newProps
  }
  if ('items' in obj) {
    result.items = rewriteSubschemas(obj.items, hoistMap, false)
  }
  if (
    'additionalProperties' in obj &&
    typeof obj.additionalProperties === 'object'
  ) {
    result.additionalProperties = rewriteSubschemas(
      obj.additionalProperties,
      hoistMap,
      false,
    )
  }
  if ('propertyNames' in obj && typeof obj.propertyNames === 'object') {
    result.propertyNames = rewriteSubschemas(obj.propertyNames, hoistMap, false)
  }
  for (const k of ['oneOf', 'anyOf', 'allOf'] as const) {
    if (Array.isArray(obj[k])) {
      result[k] = (obj[k] as unknown[]).map((item) =>
        rewriteSubschemas(item, hoistMap, false),
      )
    }
  }
  if ('not' in obj) {
    result.not = rewriteSubschemas(obj.not, hoistMap, false)
  }
  return result
}

// Detect non-trivial subtrees that appear in multiple places across
// components.schemas and hoist each to its own top-level entry, replacing
// inline copies with $refs. Handles shapes that the existing compress pass
// misses — particularly discriminated unions (and other non-z.object roots)
// that never become top-level schemas on their own.
function countSchemaRefs(doc: unknown): Map<string, number> {
  const counts = new Map<string, number>()
  const prefix = '#/components/schemas/'
  const stack: unknown[] = [doc]
  while (stack.length > 0) {
    const node = stack.pop()
    if (node === null || typeof node !== 'object') {
      continue
    }
    if (Array.isArray(node)) {
      for (const item of node) {
        stack.push(item)
      }
      continue
    }
    const obj = node as Record<string, unknown>
    const ref = obj.$ref
    if (typeof ref === 'string' && ref.startsWith(prefix)) {
      const name = ref.slice(prefix.length)
      counts.set(name, (counts.get(name) ?? 0) + 1)
      continue
    }
    for (const v of Object.values(obj)) {
      stack.push(v)
    }
  }
  return counts
}

function inlineRefsTo(
  node: unknown,
  name: string,
  definition: unknown,
): unknown {
  if (node === null || typeof node !== 'object') {
    return node
  }
  if (Array.isArray(node)) {
    return node.map((item) => inlineRefsTo(item, name, definition))
  }
  const obj = node as Record<string, unknown>
  if (obj.$ref === `#/components/schemas/${name}`) {
    return JSON.parse(JSON.stringify(definition))
  }
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    result[k] = inlineRefsTo(v, name, definition)
  }
  return result
}

function hoistSharedSubschemas(document: OpenAPIObject): OpenAPIObject {
  if (!document.components?.schemas) {
    return document
  }
  let schemas: Record<string, SchemaObject | ReferenceObject> = {
    ...document.components.schemas,
  }
  const addedNames = new Set<string>()

  // Iteratively hoist the most-shared subtree at a time. After each hoist,
  // its inline copies become $refs, so the next scan sees only genuinely
  // remaining duplicates — this avoids over-counting nested subtrees that
  // would have been covered by hoisting their parent.
  for (let iter = 0; iter < 1000; iter++) {
    const occurrences = new Map<
      string,
      { count: number; propNames: string[]; sample: unknown }
    >()
    for (const schema of Object.values(schemas)) {
      walkForOccurrences(schema, null, true, occurrences)
    }
    const candidates = [...occurrences.entries()].filter(
      ([, info]) => info.count >= 2,
    )
    if (candidates.length === 0) {
      break
    }

    // Sort: highest count first, then largest canonical (so outer/containing
    // shapes hoist before their inner subtrees — once the outer is replaced
    // with a $ref, the inner subtree's count naturally collapses), then by
    // canonical string for determinism.
    candidates.sort(
      ([a, ai], [b, bi]) =>
        bi.count - ai.count || b.length - a.length || a.localeCompare(b),
    )

    // Walk candidates in priority order; pick the first one we can derive a
    // name for. A candidate without a parent property name AND below the
    // minimum size for an anonymous hoist is skipped.
    const taken = new Set(Object.keys(schemas))
    let chosen:
      | {
          canonical: string
          info: {
            count: number
            propNames: string[]
            sample: unknown
          }
          name: string
        }
      | undefined
    for (const [canonical, info] of candidates) {
      const name = deriveSchemaName(info.propNames, canonical, taken)
      if (name) {
        chosen = { canonical, info, name }
        break
      }
    }
    if (!chosen) {
      break
    }
    const { canonical, info: chosenInfo, name } = chosen
    addedNames.add(name)
    const hoistMap = new Map([[canonical, name]])

    const newSchemas: Record<string, SchemaObject | ReferenceObject> = {}
    for (const [k, schema] of Object.entries(schemas)) {
      newSchemas[k] = rewriteSubschemas(schema, hoistMap, true) as
        | SchemaObject
        | ReferenceObject
    }
    // Use the unstripped sample as the hoisted body so annotations like
    // `default` (which were stripped only for canonical comparison) survive
    // in at least one place.
    newSchemas[name] = JSON.parse(JSON.stringify(chosenInfo.sample)) as
      | SchemaObject
      | ReferenceObject
    schemas = newSchemas
  }

  // Cleanup: inline back any schema we added that ended up referenced fewer
  // than 2 times in the final document. The hoist cascade can leave behind
  // intermediate names (e.g. shared shapes nested inside a larger shape that
  // also got hoisted) whose only reference site is inside another hoisted
  // schema — those add no compression and only add naming noise.
  for (;;) {
    const refCounts = countSchemaRefs({
      ...document,
      components: { ...document.components, schemas },
    })
    const toInline = [...addedNames].filter((n) => (refCounts.get(n) ?? 0) < 2)
    if (toInline.length === 0) {
      break
    }
    for (const n of toInline) {
      const definition = schemas[n]
      if (!definition) {
        addedNames.delete(n)
        continue
      }
      const inlinedSchemas: Record<string, SchemaObject | ReferenceObject> = {}
      for (const [k, schema] of Object.entries(schemas)) {
        if (k === n) {
          continue
        }
        inlinedSchemas[k] = inlineRefsTo(schema, n, definition) as
          | SchemaObject
          | ReferenceObject
      }
      schemas = inlinedSchemas
      addedNames.delete(n)
    }
  }

  return {
    ...document,
    components: {
      ...document.components,
      schemas,
    },
  }
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

  // bundler resolution honours @nestjs/swagger's exports map, so the public
  // `/plugin` entry resolves straight to its real types (ReadonlyVisitor).
  const { ReadonlyVisitor } = await import('@nestjs/swagger/plugin')

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
    // @nestjs/swagger's printer is typed against the typescript@5.9.3 copy that
    // @nestjs/cli pins, while we import typescript@6.0.3; the ts.Node shapes are
    // structurally identical at runtime, so cast across the two version views.
    pluginMetadata as Parameters<typeof printer.print>[0],
    visitor.typeImports,
    {
      outputDir: __dirname,
      filename: '../src/nestjs-metadata.ts',
    },
    ts as unknown as Parameters<typeof printer.print>[3],
  )

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access
  const metadata = require('../src/nestjs-metadata').default

  await SwaggerModule.loadPluginMetadata(
    metadata as () => Promise<Record<string, unknown>>,
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

  // Resolve `#/$defs/` refs cleanupOpenApiDoc left dangling inside tuples.
  const defsNormalizedDocument =
    rewriteDefsRefsToComponents(uncompressedDocument)

  // Patch z.record() DTOs that NestJS Swagger can't introspect
  const patchedDocument = patchEmptyRecordSchemas(defsNormalizedDocument)

  // Collapse nestjs-zod's per-DTO copies of recursive `.meta({ id })` schemas
  // (e.g. `<DTO>JsonSerializableValue`) back into a single shared `<Id>` entry.
  const registeredIds = new Set<string>(
    (
      (z.globalRegistry as unknown as { _idmap?: Map<string, unknown> })
        ._idmap ?? new Map<string, unknown>()
    ).keys(),
  )
  const idCollapsedDocument = collapseRegisteredIdCopies(
    patchedDocument,
    registeredIds,
  )

  // Re-resolve `#/$defs/<Id>` refs (e.g. in tuple prefixItems) now that the
  // collapse above has materialised the bare `<Id>` components they point at —
  // the first pass ran before those components existed.
  const collapseDefsNormalizedDocument =
    rewriteDefsRefsToComponents(idCollapsedDocument)

  // Flatten the self-recursive JSON-value schemas so openapi-fetch@0.17's
  // recursive `Writable<T>` doesn't degenerate on request bodies typed
  // `Record<string, JsonSerializableValue>`. Runs here, after the collapse has
  // materialised the bare `<Id>` components this targets.
  const jsonValueFlattenedDocument = breakRecursiveJsonValueSchemas(
    collapseDefsNormalizedDocument,
  )

  // Drop the top-level `id` annotation nestjs-zod attaches when a Zod schema
  // is tagged via `.meta({ id })` — the name lives in components.schemas.<key>
  // and the duplicate id field just adds noise.
  const idStrippedDocument = stripSchemaIdAnnotations(
    jsonValueFlattenedDocument,
  )

  // Collapse structurally-equivalent top-level schemas that differ only by the
  // $ref anchor names of their extracted subschemas. Fixes the per-DTO
  // fragmentation of recursive Zod schemas (`<DTO>__schemaN`) emitted by
  // nestjs-zod's cleanupOpenApiDoc, so the subsequent hoist pass sees them
  // as one shared shape rather than N parallel copies.
  const canonicalizedDocument = canonicalizeRecursiveSchemas(idStrippedDocument)

  // Convert {"type": "null"} to type-array form for Swift OpenAPI Generator compat.
  // Done before hoisting so we don't end up with anonymous Schema_xxx entries
  // for null-wrapper anyOf shapes that subsequently get simplified into primitives.
  const nullNormalizedDocument = convertNullTypesForSwiftCompat(
    canonicalizedDocument,
  )

  // Hoist subtrees that appear more than once anywhere in components.schemas
  // (e.g. discriminated unions like iconSchema) into their own top-level
  // entries, replacing inline copies with $refs.
  const hoistedDocument = hoistSharedSubschemas(nullNormalizedDocument)

  // Where possible, replace nested inline duplicate object definitions with references to the top-level definitions
  const document = compressOpenApiDocument(hoistedDocument)

  const stringifiedDocument = JSON.stringify(document, null, 2)

  fs.writeFileSync(
    path.join(__dirname, '..', 'src', './openapi.json'),
    stringifiedDocument,
  )

  // eslint-disable-next-line no-console
  console.log('Generated OpenAPI spec:', stringifiedDocument)
}

void main()
