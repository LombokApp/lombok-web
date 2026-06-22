# Upgrading openapi-fetch 0.15 → 0.17 (and openapi-react-query 0.5.1 → 0.5.4)

Status: **LANDED.** This document captures the full investigation; the resolution
that shipped is summarised immediately below, with the original analysis preserved
underneath.

## Resolution (what shipped)

The bump touched ~38 `tsc` sites across `@lombokapp/api` and `@lombokapp/ui`. The
breakage came entirely from openapi-fetch@0.17's `Writable<T>`/`Readable<T>` mapped
types (via `openapi-typescript-helpers@0.1.0`), which mangle three of our generated
type shapes. Each was fixed at the layer that owns it:

1. **Recursion → explosion (Mechanism A, ~23 sites).** `Writable<T>` degenerates on
   the self-recursive `JsonSerializableValue` request bodies. Fixed with a generator
   transform `breakRecursiveJsonValueSchemas` that flattens the self-`$ref`s in the
   `JsonSerializableValue` / `PgSafeJsonSerializableValue` component schemas to
   `unknown` leaves (cuts recursion, keeps the union shape). Server Zod stays
   recursive — only the generated client type flattens. See `generate-metadata.ts`.

2. **`null`-only properties dropped (Mechanism B-1, ~8 sites).** `Readable`/`Writable`
   key-filter is `NonNullable<T[K]> extends $… ? never : K`; for a property typed
   exactly `null`, `NonNullable<null>` is `never`, which vacuously matches, so the
   property is dropped from the client type (named generated type keeps it → every
   bridging site fails). The five affected properties are all **redacted secrets**
   (`secretAccessKey` ×2, `password`, `apiKey`, `clientSecret`). Fixed with a shared
   `redactedSecret()` schema helper —
   `z.string().nullable().refine((v): boolean => v === null)`. The `string | null`
   inferred type survives openapi-fetch (it only drops props typed *exactly* `null`),
   while the `.refine` keeps the **output serializer guard**: a leaked (non-null)
   secret fails serialization rather than shipping. The explicit `: boolean` return
   stops Zod 4 from inferring the refine as a type guard (which would narrow the type
   back to `null` and reintroduce the drop). This is `z.infer`-/spec-invariant vs the
   plain `z.string().nullable()` — the generated client is byte-identical — so it adds
   the guard with zero client-type churn. Runtime redaction is unchanged (the
   transforms still emit `null`), is unit-tested on the helper, and is guarded
   comprehensively by `no-secret-leakage.e2e-spec.ts`, which asserts `.toBeNull()` on
   every redacted field on every endpoint.

3. **Tuples widened to arrays (Mechanism B-2 + the flatten bridge).** `Readable`
   maps tuples to arrays (`["string","null"]` → `("string"|"null")[]`), which the
   custom-settings JSON-schema type (`nullableType`) and the app manifest embed. The
   form internals are built around the tuple type, so the few sites that pass query
   data into them (the two custom-settings panels, the server-apps table) narrow the
   Readable-widened query payload back to the raw generated type (`CustomSettingsData`
   / `AppDTO`) — the runtime payload genuinely matches. The custom-settings request
   bodies and the task-result display view were likewise typed to the generated
   (flattened) request/`unknown` shapes.

`./dx generate openapi` remains deterministic (the new transform sits after
`collapseRegisteredIdCopies`); the only generated-type changes vs the prior commit
are the `JsonSerializableValue` flatten and the five redacted secrets widening to
`string | null`. Full `./dx check all` green; api e2e green.

---

The bump is small on paper (catalog `openapi-fetch` and `openapi-react-query`, plus
the `simple-demo/ui` copy of `openapi-react-query`). In practice it fails `tsc` in
both `@lombokapp/api` and `@lombokapp/ui`, and the clean fix was gated behind an
unrelated, larger problem (now resolved): the OpenAPI **generator no longer
reproduced its own committed output**. Details below.

## TL;DR

- `openapi-fetch@0.17` introduced a new `Writable<T>` / `Readable<T>` type layer
  (via `openapi-typescript-helpers@0.1.0`) that wraps request bodies.
- It breaks our typed client in **two independent ways** (~38 call sites total):
  - **Mechanism A** — request bodies typed as `Record<string, JsonSerializableValue>`
    degenerate, because `JsonSerializableValue` is **self-recursive** and `Writable<T>`
    is a recursive mapped type.
  - **Mechanism B** — `secretAccessKey` (present-vs-`null`) and `HideableColumnDef`
    type-identity errors in the storage/access-key UI; independent of A, still not
    fully root-caused.
- The correct fix for A is **spec-level** (flatten the recursive schema in the
  generated client types), not a server DTO change (that ripples into server types).
- That fix requires regenerating the OpenAPI types. Regeneration *was* a hard
  blocker (the generator couldn't run, and once fixed produced a ~16k-line
  divergent `openapi.json`), but **that drift has since been reconciled** — see
  "Generator drift (RESOLVED)" below. Regeneration is now safe and deterministic.

## What breaks, exactly

After bumping all three deps and running `./dx check all`, only `@lombokapp/api tsc`
and `@lombokapp/ui tsc` fail (lint/prettier and every other package stay green).

### Mechanism A — recursive-record request bodies

~23 api sites + ~5 ui sites. Representative error:

```
src/app/tests/app-custom-settings.e2e-spec.ts(74,19): error TS2322:
  Type '{ api_key: string; theme: string; }' is not assignable to type
  '{ [x: string]: any; } & { [x: string]: undefined; }'.
```

Affected request bodies (all "arbitrary JSON object" fields):

| Endpoint | DTO | Field |
| --- | --- | --- |
| `PATCH /api/v1/user/apps/{appIdentifier}/custom-settings` | `app/dto/app-custom-settings-patch-input.dto.ts` | `values` |
| `PATCH .../folders/.../custom-settings` | same schema | `values` |
| `POST /api/v1/docker/jobs/{jobId}/complete` | `docker/dto/docker-job-complete-request.dto.ts` | `result`, `error.details` |
| `PUT /api/v1/server/settings/{settingKey}` | `server/dto/set-setting-input.dto.ts` | `value` (`z.any()` — manifests as `TS2769`) |

All of these resolve their value type, directly or transitively, to
`packages/types/src/json.types.ts`:

```ts
export const jsonSerializableValueSchema: z.ZodType<JsonSerializableValue> = z
  .lazy(() =>
    z.union([
      z.string(), z.number(), z.boolean(), z.null(),
      z.array(jsonSerializableValueSchema),
      z.record(z.string(), jsonSerializableValueSchema), // <- self-reference
    ]),
  )
  .meta({ id: 'JsonSerializableValue' })            // <- becomes a named $ref

export const jsonSerializableObjectSchema =
  z.record(z.string(), jsonSerializableValueSchema)
```

### Root cause

`openapi-fetch@0.17` types a request body as
`Writable<OperationRequestBodyContent<T>>` (see its `dist/index.d.ts`,
`type RequestBodyOption<T>`). `Writable` comes from
`openapi-typescript-helpers@0.1.0`:

```ts
type Writable<T> =
  T extends $Read<any> ? never
  : T extends $Write<infer U> ? Writable<U>
  : T extends (infer E)[] ? Writable<E>[]
  : T extends object ? {
      [K in keyof T as NonNullable<T[K]> extends $Read<any> ? never : K]: Writable<T[K]>;
    }
  : T;
```

This is a **recursive mapped type**. The generated body type is clean on its own:

```ts
// packages/types/src/api-paths.d.ts
AppCustomSettingsPatchInputDTO: { values: { [key: string]: JsonSerializableValue } }
JsonSerializableValue: (string | null) | number | boolean
  | components["schemas"]["JsonSerializableValue"][]               // recursive
  | { [key: string]: components["schemas"]["JsonSerializableValue"] } // recursive
```

But when `Writable<T>` recurses into the self-referential `JsonSerializableValue`,
TypeScript's instantiation degenerates and the field collapses to the unsatisfiable
intersection `{ [x: string]: any } & { [x: string]: undefined }`. Nothing is
assignable to that, so every call site that passes a body errors.

Note: the *generated type is fine*; only `Writable<>` applied to it explodes.
`Readable<T>` (the response counterpart) apparently does **not** explode on the same
types — response sites using `JsonSerializableValue` do not error — so this is
specific to the request-body path.

### Mechanism B — secretAccessKey / HideableColumnDef (independent)

~10 ui sites, e.g.:

```
src/contexts/server/server.provider.tsx(199,5): error TS2322:
  ... STORAGE_PROVISIONS ... '{ ...; }' not assignable to '{ ...; secretAccessKey: null; }'
src/views/server/apps/server-apps-screen/server-apps-screen.view.tsx(148,9): error TS2719:
  ... 'HideableColumnDef<...>' ... Two different types with this name exist,
  but they are unrelated.
```

Confirmed about this cluster:

- **Not** the readonly (`$Read`) path: the generated spec has **zero** `readonly`
  markers (`grep -c 'readonly ' packages/types/src/api-paths.d.ts` → 0).
- **Not** recursive-JSON: these are concrete storage-provision / access-key shapes
  that contain no `JsonSerializableValue`. The spec has both `secretAccessKey: string`
  and `secretAccessKey: null` DTO variants (the redacted vs unredacted forms).
- Likely either an `openapi-react-query@0.5.4` response-data inference change
  (`InferSelectReturnType` / `select`) or a degeneration cascade from Mechanism A.
- **Not yet isolated** — see "How to make progress" below.

## Fix design for Mechanism A (validated in principle, not landed)

Two layers were considered:

### ❌ DTO-level (rejected — ripples into server types)

Swapping the request DTOs to `z.record(z.string(), z.unknown())` does flatten the
generated client type, but it changes the **server-side** inferred type too, which
then fails where the value flows into a recursive sink. Concretely:

```ts
// docker/services/docker-worker-hook.service.ts:471
innerTaskCompletion = { success: true, result: completeJobRequest.result, ... }
// TaskCompletion.result is Record<string, JsonSerializableValue>;
// completeJobRequest.result became Record<string, unknown> -> TS2322
```

Casting these would mask real type safety, which is exactly what we want to avoid.

### ✅ Spec-level (correct layer)

Keep all server Zod schemas recursive (no server change at all) and flatten **only
the generated client types** by post-processing the OpenAPI document. The generator
already has a transform pipeline in `packages/api/script/generate-metadata.ts`
(`patchEmptyRecordSchemas`, `stripSchemaIdAnnotations`, `deduplicateNestedSchemas`,
`canonicalizeRecursiveSchemas`, `hoistSharedSubschemas`, `compressOpenApiDocument`).

Add a transform that replaces self-`$ref`s in the JSON-blob schemas with an open
schema (`{}` → `unknown`), keeping the top-level union shape but cutting recursion:

```ts
function breakRecursiveJsonValueSchemas(document: OpenAPIObject): OpenAPIObject {
  const schemas = document.components?.schemas
  if (!schemas) return document
  for (const name of ['JsonSerializableValue', 'PgSafeJsonSerializableValue']) {
    const schema = schemas[name]
    if (!schema) continue
    const selfRef = `#/components/schemas/${name}`
    const stripSelfRef = (node: unknown): unknown => {
      if (Array.isArray(node)) return node.map(stripSelfRef)
      if (node && typeof node === 'object') {
        const obj = node as Record<string, unknown>
        if (obj.$ref === selfRef) return {}
        return Object.fromEntries(
          Object.entries(obj).map(([k, v]) => [k, stripSelfRef(v)]),
        )
      }
      return node
    }
    schemas[name] = stripSelfRef(schema) as (typeof schemas)[string]
  }
  return document
}
```

Wire it into `main()` right after `patchEmptyRecordSchemas`. Result:
`JsonSerializableValue = (string|null) | number | boolean | unknown[] | { [k:string]: unknown }`
(non-recursive). `Writable<Record<string, JsonSerializableValue>>` is then clean.
Server types are untouched because they come from Zod, not from the spec.

**Caveat discovered:** by the time this transform runs, the schema may already have
been renamed by the dedup/hoist passes (we observed `AppInstallResponseJsonSerializableValue`
instead of `JsonSerializableValue`). The transform must either run **before** those
passes or match the prefixed names. This was never fully resolved because of the
blocker below.

## Generator drift (RESOLVED — fixed in `generate-metadata.ts`)

> This section originally described a hard blocker. It has since been fixed; the
> analysis is kept because it explains the fix. `./dx generate openapi` now
> deterministically reproduces the committed `openapi.json` and `api-paths.d.ts`.

### The original blocker: the OpenAPI generator did not reproduce its committed output

`./dx generate openapi` runs `bun --cwd packages/api generate:openapi`, which is
`bun generate:metadata && ./cmd/generate-openapi-spec.sh`:

1. `script/generate-metadata.ts` — boots Nest, builds the OpenAPI document via
   `@nestjs/swagger` + `nestjs-zod`, runs the transform pipeline, writes
   `packages/api/src/openapi.json`.
2. `cmd/generate-openapi-spec.sh` — `openapi-typescript src/openapi.json -o
   packages/types/src/api-paths.d.ts`, then builds `packages/types`.

Two problems surfaced:

### 1. Generator import is broken (pre-existing)

```
error: Cannot find module '@nestjs/swagger/dist/plugin'
```

`generate-metadata.ts` imports `ReadonlyVisitor` from `@nestjs/swagger/dist/plugin`,
but `@nestjs/swagger@11.4.4`'s `exports` map only exposes `./plugin` (→
`./dist/plugin/index.js`); the deep `./dist/plugin` path is blocked. Fix:

```ts
import { ReadonlyVisitor } from '@nestjs/swagger/plugin'
```

(The `import type … from '@nestjs/swagger/dist/interfaces/...'` lines are erased at
runtime, so they don't block `bun`, but should be modernized too for `tsc`.)

This has gone unnoticed because no endpoint/DTO change has required a regen recently
(pure dependency bumps are no-ops for the spec).

### 2. Regeneration diverges by ~16k lines (the real blocker)

With the import fixed, the generator runs — but the regenerated `openapi.json`
differs from the committed one by **+16,232 / −5,730 lines**. The dedup / hoist /
canonicalize passes now emit **per-DTO prefixed copies** of shared schemas
(`AppInstallResponseJsonSerializableValue`, `AppInstallResponsePgSafeJsonSerializableValue`,
…) instead of a single shared `JsonSerializableValue`. In other words the generation
toolchain (some combination of `zod@4.4`, `nestjs-zod`, `@nestjs/swagger@11.4.4`,
`openapi-typescript@7.13`) has **drifted** from whatever produced the committed
`openapi.json` / `api-paths.d.ts`.

Crucially, only the *intermediate* `openapi.json` diverged — `openapi-typescript`
normalised both forms to a **byte-identical `api-paths.d.ts`** (the artifact the
typed client actually consumes). So the drift was cosmetic for consumers but
made every regen an unreviewable diff, and it gates **any** future API/DTO change.

### The fix (applied, commit `6ed1ddb41`)

Three changes in `packages/api/script/generate-metadata.ts`:

1. **Import** — resolve `ReadonlyVisitor` at runtime via `@nestjs/swagger/plugin`
   (allowed by the exports map) through a typed dynamic import whose cast target is
   `dist/plugin` (which the classic-resolution type-checker resolves), so the value
   isn't `any` for type-aware lint:
   ```ts
   const { ReadonlyVisitor } =
     // eslint-disable-next-line @typescript-eslint/consistent-type-imports
     (await import('@nestjs/swagger/plugin')) as typeof import('@nestjs/swagger/dist/plugin')
   ```
2. **collapseRegisteredIdCopies** — a new transform that folds the per-DTO copies
   `<prefix><Id>` back into a single shared `<Id>`, using the authoritative id list
   from the Zod global registry (`z.globalRegistry._idmap`). Longest-suffix match
   keeps `JsonSerializableValue` and `PgSafeJsonSerializableValue` distinct. Matching
   only registered ids (the exact suffixes nestjs-zod uses) keeps real DTOs untouched;
   the `api-paths.d.ts`-is-invariant property is the guardrail that no public type
   changes.
3. **Re-run `rewriteDefsRefsToComponents`** after the collapse, so the now-existing
   bare components resolve the dangling `#/$defs/<Id>` refs that `cleanupOpenApiDoc`
   leaves inside tuple `prefixItems` (those only resolve once the bare component exists).

`./dx generate openapi` now deterministically reproduces the committed
`openapi.json` and `api-paths.d.ts`. `breakRecursiveJsonValueSchemas` (Mechanism A's
fix) was not needed for the drift; it was added later as part of landing M2 (see
"Resolution" at the top) and runs after `collapseRegisteredIdCopies`.

## How M2 was landed (ordered)

1. ~~Fix the generator import~~ — **done** (`6ed1ddb41`).
2. ~~Reconcile the generator drift~~ — **done** (`6ed1ddb41`); `./dx generate openapi`
   reproduces the committed spec deterministically.
3. ~~Bump the three deps~~ — **done** (`openapi-fetch`→0.17, `openapi-react-query`→0.5.4,
   demo `openapi-react-query`→0.5.4).
4. ~~Land Mechanism A's fix~~ — **done**; `breakRecursiveJsonValueSchemas` runs after
   `collapseRegisteredIdCopies` and flattens the bare `JsonSerializableValue` /
   `PgSafeJsonSerializableValue` schemas. Cleared the recursive-record sites.
5. ~~Resolve Mechanism B~~ — **done**; it was three independent things, not the
   single `secretAccessKey`/`HideableColumnDef` cluster originally guessed (see
   "Resolution" at the top): the `null`-only-property drop (fixed by widening the five
   redacted-secret Zod schemas to `string | null`), the tuple→array widening, and the
   flatten bridge from (4). The `HideableColumnDef` errors were *symptoms* of the
   first two (a column's row type diverging from the Readable-mangled query data) and
   resolved once those were fixed.
6. ~~Full e2e~~ — **done**; `bun --cwd packages/api ci:e2e:api` (the upgrade touches
   request bodies and the redacted-secret responses on real routes; the image is
   rebuilt for the deps to take effect).

## Reproduction notes / gotchas

- `openapi-fetch` latest is **0.17.0** — there is no newer release with an upstream
  fix; the regression is in 0.17.0 itself.
- The dev container bakes `node_modules` as an anonymous volume, so a host
  `bun install` does **not** reach it. After changing deps, run
  `./dx exec bun install` (or rebuild via `./dx up -d`) before in-container checks
  reflect the new versions.
- `./dx generate openapi` runs the metadata step on the **host**; `generate metadata`
  runs in the container. Either way it needs `@nestjs/swagger`'s `plugin` export to
  resolve.
- Inspect the helper machinery at
  `node_modules/.bun/openapi-fetch@0.17.0/.../dist/index.d.ts` and
  `node_modules/.bun/openapi-typescript-helpers@0.1.0/.../dist/index.d.ts`.

## File references

- `packages/types/src/json.types.ts` — `jsonSerializableValueSchema` (the recursive type)
- `packages/api/script/generate-metadata.ts` — OpenAPI document + transform pipeline
- `packages/api/cmd/generate-openapi-spec.sh` — `openapi-typescript` step
- `packages/types/src/api-paths.d.ts` — generated client types (consumed by openapi-fetch)
- `packages/api/src/openapi.json` — generated spec (input to openapi-typescript)
- Affected request DTOs: `app/dto/app-custom-settings-patch-input.dto.ts`,
  `docker/dto/docker-job-complete-request.dto.ts`, `server/dto/set-setting-input.dto.ts`
