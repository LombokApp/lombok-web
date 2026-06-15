import { z } from 'zod'

import type { LombokApiClient } from './api.types'
import { folderObjectSchema } from './content.types'
import { CORE_IDENTIFIER } from './core.types'
import { corePrefixedEventIdentifierSchema } from './events.types'
import {
  appIdentifierSchema,
  appSlugSchema,
  workerIdentifierSchema,
} from './identifiers.types'
import type {
  JsonSerializableObject,
  JsonSerializableValue,
} from './json.types'
import {
  jsonSerializableObjectSchema,
  jsonSerializableValueSchema,
} from './json.types'
import type { TaskOnCompleteConfig } from './task.types'
import { taskConfigSchema, taskTriggerConfigSchema } from './task.types'

export const AppSocketMessage = z.enum([
  'GET_LATEST_DB_CREDENTIALS',
  'SAVE_LOG_ENTRY',
  'GET_APP_STORAGE_SIGNED_URLS',
  'GET_CONTENT_SIGNED_URLS',
  'GET_METADATA_SIGNED_URLS',
  'MINT_APP_USER_TOKEN',
  'UPDATE_CONTENT_METADATA',
  'EMIT_EVENT',
  'EXECUTE_APP_DOCKER_JOB',
  'EXECUTE_APP_DOCKER_JOB_ASYNC',
  'GET_APP_TASK',
  'TRIGGER_APP_TASK',
  'REPORT_TASK_PROGRESS',
  'GET_APP_CUSTOM_SETTINGS',
  'PATCH_APP_CUSTOM_SETTINGS',
  'CREATE_BRIDGE_TUNNEL',
  'DELETE_BRIDGE_TUNNEL',
  'DESTROY_APP_DOCKER_CONTAINERS',
  'RESOLVE_APP_DOCKER_CONTAINER',
  'INSPECT_APP_DOCKER_CONTAINER',
  'START_APP_DOCKER_CONTAINER',
  'REGISTER_APP_TRIGGER',
  'UNREGISTER_APP_TRIGGER',
  'LIST_APP_TRIGGERS',
])

export const appMessageErrorSchema = z.object({
  code: z.union([z.number(), z.string()]),
  message: z.string(),
  details: jsonSerializableObjectSchema.optional(),
})

export type WorkerApiActor =
  | {
      actorType: 'app_user'
      userId: string
      worker?: string
      platformAccess: boolean
      extra?: JsonSerializableObject
      userApiClient: LombokApiClient
    }
  | {
      actorType: 'system'
    }

export const appSocketMessageSchema = z.object({
  name: AppSocketMessage,
  data: z.unknown(),
})

export type AppSocketApiRequest = z.infer<typeof appSocketMessageSchema>

export enum ConfigParamType {
  boolean = 'boolean',
  string = 'string',
  number = 'number',
}

export const paramConfigSchema = z.object({
  type: z.enum(ConfigParamType),
  default: z.union([z.string(), z.number(), z.boolean()]).optional().nullable(),
})

/**
 * Catalog version implemented by the platform. Apps may pin this value
 * (via {@link appConfigSchema.catalogVersion}) to validate against a known
 * snapshot. Removals from the catalog require a major bump.
 */
export const ICON_CATALOG_VERSION = '1' as const

/**
 * V1 builtin icon names — the platform's published catalog. Each rendering
 * client (web, iOS, Android) implements its own mapping from these names to
 * concrete icon assets. Membership is enforced at install time but the wire
 * representation is a plain string so adding a name doesn't churn every
 * generated client type.
 */
export const BUILTIN_ICON_NAMES = [
  'app',
  'box',
  'code',
  'file',
  'folder',
  'settings',
  'sparkles',
  'terminal',
] as const

export type BuiltinIconName = (typeof BUILTIN_ICON_NAMES)[number]

const BUILTIN_ICON_NAMES_SET: Set<string> = new Set<string>(BUILTIN_ICON_NAMES)

export const builtinIconNameSchema = z
  .string()
  .nonempty()
  .refine((name) => BUILTIN_ICON_NAMES_SET.has(name), {
    message: `Unknown builtin icon. Must be one of: ${BUILTIN_ICON_NAMES.join(', ')}`,
  })

const iconAppearanceSchema = z.enum(['light', 'dark', 'any'])
const pngScaleSchema = z.union([z.literal(1), z.literal(2), z.literal(3)])

const iconSvgAssetSchema = z
  .object({
    path: z.string().nonempty(),
    appearance: iconAppearanceSchema.optional(),
  })
  .strict()

const iconPngAssetSchema = z
  .object({
    path: z.string().nonempty(),
    scale: pngScaleSchema,
    appearance: iconAppearanceSchema.optional(),
  })
  .strict()

const builtinIconSchema = z
  .object({
    source: z.literal('builtin'),
    label: z.string().nonempty().optional(),
    name: builtinIconNameSchema,
  })
  .strict()

const customSvgIconSchema = z
  .object({
    source: z.literal('custom'),
    label: z.string().nonempty().optional(),
    format: z.literal('svg'),
    rendering: z.enum(['template', 'original']),
    assets: z.array(iconSvgAssetSchema).min(1),
  })
  .strict()

const customPngIconSchema = z
  .object({
    source: z.literal('custom'),
    label: z.string().nonempty().optional(),
    format: z.literal('png'),
    // PNG + template is intentionally banned in V1 — use SVG for tintable icons.
    rendering: z.literal('original'),
    assets: z.array(iconPngAssetSchema).min(1),
  })
  .strict()

const validateAppearanceCombinations = (
  assets: { appearance?: 'light' | 'dark' | 'any' }[],
  ctx: z.RefinementCtx,
  // SVG has no scale dimension, so at most one asset per appearance. PNG allows
  // multiple scale variants per appearance — uniqueness is enforced on
  // (appearance, scale) separately — so only the mixing rule applies here.
  enforceSingleAny: boolean,
  pathPrefix: (string | number)[] = ['assets'],
) => {
  const present = new Set(assets.map((asset) => asset.appearance ?? 'any'))
  if (present.has('any') && (present.has('light') || present.has('dark'))) {
    ctx.addIssue({
      code: 'custom',
      message:
        'Icon assets cannot mix appearance "any" with "light" or "dark" — supply either an "any" asset, or up to one "light" and one "dark".',
      path: pathPrefix,
    })
  }
  if (enforceSingleAny) {
    const anyCount = assets.filter(
      (asset) => (asset.appearance ?? 'any') === 'any',
    ).length
    if (anyCount > 1) {
      ctx.addIssue({
        code: 'custom',
        message:
          'At most one icon asset may have appearance "any" (or no appearance set).',
        path: pathPrefix,
      })
    }
  }
}

const customIconSchema = z.discriminatedUnion('format', [
  customSvgIconSchema,
  customPngIconSchema,
])

export const iconSchema = z
  .discriminatedUnion('source', [builtinIconSchema, customIconSchema])
  .superRefine((icon, ctx) => {
    if (icon.source !== 'custom') {
      return
    }
    if (icon.format === 'svg') {
      validateAppearanceCombinations(icon.assets, ctx, true)
      return
    }
    // PNG: enforce (appearance, scale) uniqueness, mixing rules per appearance,
    // and require at least one asset with scale >= 2.
    const perAppearance = new Map<
      'light' | 'dark' | 'any',
      Map<number, number>
    >()
    icon.assets.forEach((asset, index) => {
      const appearance = asset.appearance ?? 'any'
      let scales = perAppearance.get(appearance)
      if (!scales) {
        scales = new Map()
        perAppearance.set(appearance, scales)
      }
      const seenAt = scales.get(asset.scale)
      if (seenAt !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate PNG asset for appearance "${appearance}" at scale ${asset.scale} (also at index ${seenAt}).`,
          path: ['assets', index],
        })
      } else {
        scales.set(asset.scale, index)
      }
    })

    validateAppearanceCombinations(icon.assets, ctx, false)

    const hasHighDensity = icon.assets.some(
      (asset) => asset.scale === 2 || asset.scale === 3,
    )
    if (!hasHighDensity) {
      ctx.addIssue({
        code: 'custom',
        message:
          'PNG icons require at least one asset at scale 2 or 3 — a lone 1x asset will look soft on high-density displays.',
        path: ['assets'],
      })
    }
  })

export type Icon = z.infer<typeof iconSchema>

export const appUILinkSchema = z.object({
  label: z.string(),
  icon: iconSchema.optional(),
  path: z.string(),
})

export const appManifestEntrySchema = z
  .object({
    hash: z.string(),
    size: z.number(),
    mimeType: z.string(),
  })
  .meta({ id: 'AppManifestEntry' })

export const appManifestSchema = z.record(z.string(), appManifestEntrySchema)

export const workerEntrypointSchema = z
  .string()
  .nonempty()
  .refine((path) => !path.startsWith('/'), {
    message: 'Entrypoint must be a relative path (cannot start with "/")',
  })
  .refine((path) => !path.startsWith('./'), {
    message:
      'Entrypoint should not start with "./" (relative paths are implicit)',
  })
  .refine((path) => !path.includes('..'), {
    message: 'Entrypoint cannot contain ".." (parent directory references)',
  })
  .refine((path) => !path.includes('\\'), {
    message: 'Entrypoint must use forward slashes "/" (not backslashes)',
  })
  .refine((path) => path.trim() === path, {
    message: 'Entrypoint cannot have leading or trailing whitespace',
  })
  .refine((path) => !path.includes('//'), {
    message: 'Entrypoint cannot contain consecutive slashes "//"',
  })

export const appUIConfigSchema = z
  .object({
    description: z.string(),
  })
  .strict()

export const appRuntimeWorkerConfigSchema = z.object({
  label: z.string().optional(),
  description: z.string(),
  environmentVariables: z.record(z.string(), z.string()).optional(),
  entrypoint: workerEntrypointSchema,
})

export const appRuntimeWorkerSchema = z
  .object({
    label: z.string(),
    description: z.string(),
    environmentVariables: z.record(z.string(), z.string()),
    entrypoint: workerEntrypointSchema,
  })
  .strict()

export const appContributionEmbedLinkSchema = z
  .object({
    path: z.string().nonempty().startsWith('/', {
      message: 'Path must start with a forwardslash',
    }),
    label: z.string().nonempty(),
    icon: iconSchema.optional(),
  })
  .strict()
  .meta({ id: 'AppContributedView' })

export const appContributedViewsSchema = z
  .array(appContributionEmbedLinkSchema)
  .meta({ id: 'AppContributedViews' })

// A dynamic string is either a literal or a pointer into the view's data model.
export const mobileDynamicStringSchema = z
  .union([z.string(), z.object({ path: z.string().nonempty() }).strict()])
  .meta({ id: 'MobileDynamicString' })

export const mobileAccessibilitySchema = z
  .object({
    label: mobileDynamicStringSchema.optional(),
    description: mobileDynamicStringSchema.optional(),
  })
  .strict()
  .refine((a) => a.label !== undefined || a.description !== undefined, {
    message: 'accessibility requires at least one of label or description',
  })
  .meta({ id: 'MobileAccessibility' })

export const mobileEventSchema = z
  .object({
    name: z.string().nonempty(),
    context: jsonSerializableObjectSchema.optional(),
  })
  .strict()
  .meta({ id: 'MobileEvent' })

export const mobileActionSchema = z
  .object({ event: mobileEventSchema })
  .strict()
  .meta({ id: 'MobileAction' })

// Components are a generic envelope: a few typed anchor keys plus freeform,
// component-specific properties. New component types need no schema change.
export const mobileComponentSchema = z
  .object({
    id: z.string().nonempty(),
    component: z.string().nonempty(),
    weight: z.number().optional(),
    accessibility: mobileAccessibilitySchema.optional(),
    action: mobileActionSchema.optional(),
  })
  .catchall(jsonSerializableValueSchema)
  .meta({ id: 'MobileComponent' })

const mobileQueryArgSchema = z.union([
  z.object({ fromPath: z.string().nonempty() }).strict(),
  jsonSerializableValueSchema,
])

// A reference to a named query (a key in `mobile.queries`). `args` are passed
// to the query when it runs — each value is either a literal or a `{ fromPath }`
// pointer resolved against the view's data model.
export const mobileQueryRefSchema = z
  .object({
    name: z.string().nonempty(),
    args: z.record(z.string(), mobileQueryArgSchema).optional(),
  })
  .strict()
  .meta({ id: 'MobileQueryRef' })

// A binding resolves a query reference and writes its result into the view's
// data model at `targetPath` (and toggles `loadingPath` while in flight).
export const mobileQueryBindingSchema = z
  .object({
    query: mobileQueryRefSchema,
    targetPath: z.string().nonempty(),
    loadingPath: z.string().nonempty().optional(),
  })
  .strict()
  .meta({ id: 'MobileQueryBinding' })

// Collects the component ids referenced by another component's child wiring.
// Child references live in freeform props, so we read them defensively:
// `children` is either a string-array (Column/Row) or a List template
// `{ componentId, path }`; `child` is a single id (Button).
const collectChildReferences = (
  component: Record<string, unknown>,
): string[] => {
  const refs: string[] = []
  const { children, child } = component
  if (Array.isArray(children)) {
    for (const entry of children) {
      if (typeof entry === 'string') {
        refs.push(entry)
      }
    }
  } else if (
    children !== null &&
    typeof children === 'object' &&
    'componentId' in children &&
    typeof children.componentId === 'string'
  ) {
    refs.push(children.componentId)
  }
  if (typeof child === 'string') {
    refs.push(child)
  }
  return refs
}

// Structural checks shared by views and the mobile root: component ids are
// unique, a "root" component exists, and every child reference resolves.
const refineComponentTree = (
  components: z.infer<typeof mobileComponentSchema>[],
  ctx: z.RefinementCtx,
): void => {
  const ids = new Set<string>()
  components.forEach((component, index) => {
    if (ids.has(component.id)) {
      ctx.addIssue({
        code: 'custom',
        message: `Duplicate component id "${component.id}"`,
        path: ['components', index, 'id'],
      })
    } else {
      ids.add(component.id)
    }
  })
  if (!ids.has('root')) {
    ctx.addIssue({
      code: 'custom',
      message: 'A component tree must contain a component with id "root"',
      path: ['components'],
    })
  }
  components.forEach((component, index) => {
    for (const ref of collectChildReferences(component)) {
      if (!ids.has(ref)) {
        ctx.addIssue({
          code: 'custom',
          message: `Component "${component.id}" references unknown component id "${ref}"`,
          path: ['components', index],
        })
      }
    }
  })
}

export const mobileRootViewSchema = z
  .object({
    id: z.string().nonempty(),
    // Marks this view as the app's nav-root (entry) surface — the one embedded
    // at the app's root. Exactly one view in `mobile.root.views` must set it.
    navRoot: z.boolean().optional(),
    refreshable: z.boolean().optional(),
    components: z.array(mobileComponentSchema).min(1),
    initialDataModel: jsonSerializableObjectSchema.optional(),
    initialQueries: z.array(mobileQueryBindingSchema).optional(),
    actionMap: z
      .record(z.string(), z.array(mobileQueryBindingSchema))
      .optional(),
  })
  .strict()
  .superRefine((view, ctx) => {
    refineComponentTree(view.components, ctx)
  })
  .meta({ id: 'MobileRootView' })

export const MOBILE_HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
] as const

/**
 * A query's `source` decides where it resolves — the platform API or an app
 * worker — not its key. Keys are dot/underscore-separated lowercase segments;
 * prefixing by data source (e.g. `lombok.viewer`, `app.workspaces.list`) is a
 * convention, not a requirement.
 */
export const MOBILE_QUERY_KEY_REGEX = /^[a-z0-9]+(?:[._][a-z0-9]+)*$/

export const mobileQueryKeySchema = z.string().regex(MOBILE_QUERY_KEY_REGEX, {
  message:
    'Mobile query keys must be dot/underscore-separated lowercase segments (e.g. "lombok.viewer", "app.workspaces.list")',
})

const mobileQueryPathSchema = z.string().nonempty().startsWith('/', {
  message: 'Query path must be an absolute path starting with "/"',
})

// A transform reshapes a query's raw response before it lands in the view's
// data model — a recursive walk over literals and operator nodes (an object
// with exactly one `$`-prefixed operator key: $ref, $if/$cond, $map, $call).
// Conditions ($eq/$exists/$in/$and/$or/$not) are a separate closed predicate
// set, valid only where a condition is expected ($if, each $cond clause's `if`,
// and inside $and/$or/$not). An $eq/$in operand is a value (path, literal, or
// value operator) — i.e. a transform, never a condition.
//
// The recursion is routed through interfaces (not bare union aliases) so the
// mutual Transform ⇄ Condition reference doesn't trip TS's circular-alias check.
interface MobileQueryTransformRef {
  $ref: string
}
interface MobileQueryTransformIf {
  $if: MobileQueryTransformCondition
  then: MobileQueryTransform
  else?: MobileQueryTransform
}
interface MobileQueryTransformCondClause {
  if: MobileQueryTransformCondition
  then: MobileQueryTransform
}
interface MobileQueryTransformCond {
  $cond: MobileQueryTransformCondClause[]
  else?: MobileQueryTransform
}
interface MobileQueryTransformMap {
  $map: string
  to: MobileQueryTransform
}
interface MobileQueryTransformCall {
  $call: string
  args?: Record<string, MobileQueryTransform>
}

export type MobileQueryTransform =
  | MobileQueryTransformRef
  | MobileQueryTransformIf
  | MobileQueryTransformCond
  | MobileQueryTransformMap
  | MobileQueryTransformCall
  | string
  | number
  | boolean
  | null
  | MobileQueryTransform[]
  // Index signature (not Record<>) so the self-reference defers — otherwise TS
  // flags the alias as circular. The eslint indexed-object-style rule has a
  // circular-reference exception that leaves this form alone.
  | { [key: string]: MobileQueryTransform }

interface MobileQueryTransformEq {
  $eq: [MobileQueryTransform, MobileQueryTransform]
}
interface MobileQueryTransformExists {
  $exists: string
}
interface MobileQueryTransformIn {
  $in: [MobileQueryTransform, JsonSerializableValue[]]
}
interface MobileQueryTransformAnd {
  $and: MobileQueryTransformCondition[]
}
interface MobileQueryTransformOr {
  $or: MobileQueryTransformCondition[]
}
interface MobileQueryTransformNot {
  $not: MobileQueryTransformCondition
}

export type MobileQueryTransformCondition =
  | MobileQueryTransformEq
  | MobileQueryTransformExists
  | MobileQueryTransformIn
  | MobileQueryTransformAnd
  | MobileQueryTransformOr
  | MobileQueryTransformNot

// JSON Pointer path: "/abs/path" (absolute), "rel/path" (scope-relative), or
// "" for the current scope itself — e.g. `$map: ""` over a root array, or
// `$ref: ""` for the item the enclosing `$map` is iterating.
const mobileQueryTransformPathSchema = z.string()

// The mapping is defined before the condition schema so that the $eq/$in tuple
// operands below reference an already-typed schema (a forward reference would
// widen the tuple's element type to `any`).
/* eslint-disable @typescript-eslint/no-use-before-define, no-use-before-define -- mutually recursive with mobileQueryTransformConditionSchema (defined below) */
export const mobileQueryTransformSchema: z.ZodType<MobileQueryTransform> = z
  .lazy(() =>
    z.union([
      // operator nodes — companion keys are part of the operator, not output
      z.object({ $ref: mobileQueryTransformPathSchema }).strict(),
      z
        .object({
          $if: mobileQueryTransformConditionSchema,
          then: mobileQueryTransformSchema,
          else: mobileQueryTransformSchema.optional(),
        })
        .strict(),
      z
        .object({
          $cond: z
            .array(
              z
                .object({
                  if: mobileQueryTransformConditionSchema,
                  then: mobileQueryTransformSchema,
                })
                .strict(),
            )
            .min(1),
          else: mobileQueryTransformSchema.optional(),
        })
        .strict(),
      z
        .object({
          $map: mobileQueryTransformPathSchema,
          to: mobileQueryTransformSchema,
        })
        .strict(),
      z
        .object({
          $call: z.string().min(1),
          args: z.record(z.string(), mobileQueryTransformSchema).optional(),
        })
        .strict(),
      // plain literals (evaluate to themselves)
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(mobileQueryTransformSchema),
      // plain object: every value is itself a transform, keys copied verbatim.
      // Reject any $-prefixed key so a malformed operator node fails instead of
      // silently passing as a plain object.
      z
        .record(z.string(), mobileQueryTransformSchema)
        .refine((o) => !Object.keys(o).some((k) => k.startsWith('$')), {
          message: 'object with a $-prefixed key must be a valid operator node',
        }),
    ]),
  )
  .meta({ id: 'MobileQueryTransform' })
/* eslint-enable @typescript-eslint/no-use-before-define, no-use-before-define */

export const mobileQueryTransformConditionSchema: z.ZodType<MobileQueryTransformCondition> =
  z
    .lazy(() =>
      z.union([
        // strict, non-coercing equality; operands are paths/literals/value-ops
        z
          .object({
            $eq: z.tuple([
              mobileQueryTransformSchema,
              mobileQueryTransformSchema,
            ]),
          })
          .strict(),
        z.object({ $exists: mobileQueryTransformPathSchema }).strict(),
        z
          .object({
            $in: z.tuple([
              mobileQueryTransformSchema,
              z.array(jsonSerializableValueSchema),
            ]),
          })
          .strict(),
        z
          .object({ $and: z.array(mobileQueryTransformConditionSchema) })
          .strict(), // empty ⇒ true
        z
          .object({ $or: z.array(mobileQueryTransformConditionSchema) })
          .strict(), // empty ⇒ false
        z.object({ $not: mobileQueryTransformConditionSchema }).strict(),
      ]),
    )
    .meta({ id: 'MobileQueryTransformCondition' })

// `source` discriminates resolution: `lombok` needs only a path (platform API);
// `app` also requires the named `worker` that serves it. An optional `transform`
// reshapes the response before it lands in the view's data model.
export const mobileQueryDefinitionSchema = z
  .discriminatedUnion('source', [
    z
      .object({
        source: z.literal('lombok'),
        path: mobileQueryPathSchema,
        method: z.enum(MOBILE_HTTP_METHODS).optional(),
        transform: mobileQueryTransformSchema.optional(),
      })
      .strict(),
    z
      .object({
        source: z.literal('app'),
        path: mobileQueryPathSchema,
        method: z.enum(MOBILE_HTTP_METHODS).optional(),
        worker: workerIdentifierSchema,
        transform: mobileQueryTransformSchema.optional(),
      })
      .strict(),
  ])
  .meta({ id: 'MobileQueryDefinition' })

export const mobileQueriesSchema = z.record(
  mobileQueryKeySchema,
  mobileQueryDefinitionSchema,
)

// The mobile root is the app's home content — the set of views rendered at the
// app's root. Exactly one view is flagged `navRoot: true` (the entry surface
// embedded at the root); the rest are its in-app `navigate` drill-down targets.
export const mobileRootSchema = z
  .object({
    views: z.array(mobileRootViewSchema).min(1),
  })
  .strict()
  .superRefine((root, ctx) => {
    const viewIds = new Set<string>()
    root.views.forEach((view, index) => {
      if (viewIds.has(view.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate view id "${view.id}"`,
          path: ['views', index, 'id'],
        })
      } else {
        viewIds.add(view.id)
      }
    })

    // Exactly one view is the nav-root (entry) surface.
    const navRootCount = root.views.filter((view) => view.navRoot).length
    if (navRootCount !== 1) {
      ctx.addIssue({
        code: 'custom',
        message:
          navRootCount === 0
            ? 'Exactly one mobile root view must be flagged `navRoot: true`'
            : 'Only one mobile root view may be flagged `navRoot: true`',
        path: ['views'],
      })
    }

    // `navigate` actions must target a view that exists within the root.
    root.views.forEach((view, viewIndex) => {
      view.components.forEach((component, componentIndex) => {
        const event = component.action?.event
        if (event?.name !== 'navigate') {
          return
        }
        const target = event.context?.target
        if (typeof target === 'string' && !viewIds.has(target)) {
          ctx.addIssue({
            code: 'custom',
            message: `navigate action targets unknown view id "${target}"`,
            path: [
              'views',
              viewIndex,
              'components',
              componentIndex,
              'action',
              'event',
              'context',
              'target',
            ],
          })
        }
      })
    })
  })
  .meta({ id: 'MobileRoot' })

export const mobileContributionsSchema = z
  .object({
    queries: mobileQueriesSchema.optional(),
    root: mobileRootSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    // Every query binding must reference a query declared in `queries`.
    const queryKeys = new Set(Object.keys(value.queries ?? {}))
    const checkBindings = (
      bindings: { query: { name: string } }[] | undefined,
      path: (string | number)[],
    ) => {
      bindings?.forEach((binding, bindingIndex) => {
        if (!queryKeys.has(binding.query.name)) {
          ctx.addIssue({
            code: 'custom',
            message: `Unknown query "${binding.query.name}". Must be one of: ${
              queryKeys.size > 0 ? [...queryKeys].join(', ') : '(none)'
            }`,
            path: [...path, bindingIndex, 'query', 'name'],
          })
        }
      })
    }
    value.root?.views.forEach((view, viewIndex) => {
      checkBindings(view.initialQueries, [
        'root',
        'views',
        viewIndex,
        'initialQueries',
      ])
      if (view.actionMap) {
        Object.entries(view.actionMap).forEach(([action, bindings]) => {
          checkBindings(bindings, [
            'root',
            'views',
            viewIndex,
            'actionMap',
            action,
          ])
        })
      }
    })
  })

export const appContributionsSchema = z
  .object({
    sidebarMenuLinks: appContributedViewsSchema,
    folderSidebarViews: appContributedViewsSchema,
    objectSidebarViews: appContributedViewsSchema,
    objectDetailViews: appContributedViewsSchema,
    folderDetailViews: appContributedViewsSchema,
    mobile: mobileContributionsSchema.optional(),
  })
  .strict()

// Permissions that can be granted to an app for the core
export const coreScopeAppPermissionsSchema = z
  .enum([
    'READ_FOLDER_ACL', // Read the user <-> folder ACL context
  ])
  .meta({ id: 'CoreScopeAppPermission' })

// Permissions that can be granted to an app for a specific user
export const userScopeAppPermissionsSchema = z
  .enum([
    'CREATE_FOLDERS', // create a new folder
    'READ_FOLDERS', // get/list folders
    'UPDATE_FOLDERS', // update a folder (name)
    'DELETE_FOLDERS', // delete a folder
    'READ_USER', // get user details
  ])
  .meta({ id: 'UserScopeAppPermission' })

// Permissions that can be granted to an app for a specific folder
export const folderScopeAppPermissionsSchema = z
  .enum([
    'READ_OBJECTS', // get/list objects and their metadata
    'WRITE_OBJECTS', // create/update/delete objects
    'WRITE_OBJECTS_METADATA', // create/update/delete object metadata
    'WRITE_FOLDER_METADATA', // create/update/delete folder metadata
    'REINDEX_FOLDER',
  ])
  .meta({ id: 'FolderScopeAppPermission' })

export type CoreScopeAppPermissions = z.infer<
  typeof coreScopeAppPermissionsSchema
>
export type UserScopeAppPermissions = z.infer<
  typeof userScopeAppPermissionsSchema
>
export type FolderScopeAppPermissions = z.infer<
  typeof folderScopeAppPermissionsSchema
>

export const containerProfileResourceHintsSchema = z
  .object({
    gpu: z.boolean().optional(),
    memoryMB: z.number().positive().optional(),
    cpuCores: z.number().positive().optional(),
  })
  .strict()

export const dockerWorkerCommandSchema = z.array(z.string().nonempty())

export const dockerWorkerJobIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z_]+$/)

export const containerTargetSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('instance'),
    containerIdTemplate: z.string(),
    userIsolation: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('class'),
    isolationKeyTemplate: z.string().optional(),
    userIsolation: z.boolean().optional(),
  }),
])

export const containerProfileJobDefinitionSchema = z
  .object({
    containerTarget: containerTargetSchema.nullable().optional(),
  })
  .strict()

export const httpJobDefinitionSchema =
  containerProfileJobDefinitionSchema.extend(
    z.object({ identifier: dockerWorkerJobIdentifierSchema }).shape,
  )

export const execJobDefinitionSchema = z
  .object({
    kind: z.literal('exec'),
    command: dockerWorkerCommandSchema,
    jobIdentifier: dockerWorkerJobIdentifierSchema,
  })
  .extend(containerProfileJobDefinitionSchema.shape)

export const dockerWorkerConfigSchema = z.discriminatedUnion('kind', [
  execJobDefinitionSchema,
  z.object({
    kind: z.literal('http'),
    command: dockerWorkerCommandSchema,
    port: z.number().positive().max(65535),
    jobs: z.array(httpJobDefinitionSchema),
  }),
])

export const containerProfileConfigSchema = z
  .object({
    image: z.string(),
    // environmentVariables: z.record(z.string(), z.string()).optional(),
    // Resource hints (optional suggestions, not hard limits)
    resources: containerProfileResourceHintsSchema.optional(),
    // Desired concurrency hints
    // desiredContainers: z.number().positive().optional(),
    // desiredMaxJobsPerContainer: z.number().positive().optional(),
    // jobClasses: z.record(z.string(), containerProfileJobClassSchema),
    workers: z.array(dockerWorkerConfigSchema),
    // Discriminated union for container targeting strategy.
    // 'instance' — target a specific container by resolved ID.
    // 'class' — find-or-create a container by isolation key.
    // Omitted — shared container per profile (backward-compatible default).
    containerTarget: containerTargetSchema.optional(),
  })
  .strict()

export const appProfileIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z_]+$/)
  .refine((v) => v.toLowerCase() === v)

export const appSystemRequestRuntimeWorkersSchema = z
  .object({
    performSearch: workerIdentifierSchema.array(),
  })
  .strict()

/**
 * Per-primitive `type` value: either the literal (e.g. `"string"`) or a
 * two-element tuple `[literal, "null"]` to mark the field nullable. This is
 * standard JSON Schema 07 — supporting it lets app authors express nullable
 * fields without dropping into `oneOf`. The accompanying `json-schema-to-zod`
 * helpers detect the tuple form and emit a `.nullable()` Zod schema.
 */
const nullableType = <T extends 'string' | 'number' | 'integer' | 'boolean'>(
  t: T,
) => z.union([z.literal(t), z.tuple([z.literal(t), z.literal('null')])])

const jsonSchema07StringPropertySchema = z
  .object({
    type: nullableType('string'),
    description: z.string().optional(),
    default: z.string().optional(),
    enum: z.array(z.string()).optional(),
    minLength: z.number().int().min(0).optional(),
    maxLength: z.number().int().min(0).optional(),
    pattern: z.string().optional(),
  })
  .meta({ id: 'JsonSchema07StringProperty' })

const jsonSchema07NumberPropertySchema = z
  .object({
    type: nullableType('number'),
    description: z.string().optional(),
    default: z.number().optional(),
    minimum: z.number().optional(),
    maximum: z.number().optional(),
  })
  .meta({ id: 'JsonSchema07NumberProperty' })

const jsonSchema07IntegerPropertySchema = z
  .object({
    type: nullableType('integer'),
    description: z.string().optional(),
    default: z.number().int().optional(),
    minimum: z.number().int().optional(),
    maximum: z.number().int().optional(),
  })
  .meta({ id: 'JsonSchema07IntegerProperty' })

const jsonSchema07BooleanPropertySchema = z
  .object({
    type: nullableType('boolean'),
    description: z.string().optional(),
    default: z.boolean().optional(),
  })
  .meta({ id: 'JsonSchema07BooleanProperty' })

/**
 * Primitive-only property schema — used for top-level settings
 * and as the property type within array object items.
 */
export const jsonSchema07PrimitivePropertySchema = z.union([
  jsonSchema07StringPropertySchema,
  jsonSchema07NumberPropertySchema,
  jsonSchema07IntegerPropertySchema,
  jsonSchema07BooleanPropertySchema,
])

export type JsonSchema07PrimitiveProperty = z.infer<
  typeof jsonSchema07PrimitivePropertySchema
>

/**
 * Property schema for object items — primitives, primitive-typed arrays,
 * and nested objects (with primitive/primitive-array properties).
 * Allows e.g. `THINGS: { type: 'array', items: { type: 'string' } }` inside object items.
 */
export type JsonSchema07ObjectItemProperty =
  | z.infer<typeof jsonSchema07PrimitivePropertySchema>
  | {
      type: 'array'
      description?: string
      default?: unknown[]
      items:
        | { type: 'string' | 'number' | 'integer' | 'boolean' }
        | {
            type: 'object'
            properties?: Record<string, JsonSchema07ObjectItemProperty>
            additionalProperties?: JsonSchema07ObjectItemProperty
            required?: string[]
          }
      minItems?: number
      maxItems?: number
    }
  | {
      type: 'object'
      description?: string
      default?: Record<string, unknown>
      properties?: Record<string, JsonSchema07ObjectItemProperty>
      additionalProperties?: JsonSchema07ObjectItemProperty
      required?: string[]
    }

// Element type for primitive-typed arrays, e.g. `items: { type: 'string' }`.
const jsonSchema07ArrayItemPrimitiveSchema = z
  .object({
    type: z.enum(['string', 'number', 'integer', 'boolean']),
  })
  .meta({ id: 'JsonSchema07ArrayItemPrimitive' })

// The nested-object variant of an object-item property (carries description /
// default and recurses through the object-item-property union). Shared by both
// the object-item-property union and the top-level property union.
const jsonSchema07NestedObjectItemPropertySchema: z.ZodType<
  Extract<JsonSchema07ObjectItemProperty, { type: 'object' }>
> = z
  .object({
    type: z.literal('object'),
    description: z.string().optional(),
    default: z.record(z.string(), z.unknown()).optional(),
    properties: z
      .record(
        z.string(),
        // eslint-disable-next-line @typescript-eslint/no-use-before-define, no-use-before-define
        z.lazy(() => jsonSchema07ObjectItemPropertySchema),
      )
      .optional(),
    additionalProperties: z
      // eslint-disable-next-line @typescript-eslint/no-use-before-define, no-use-before-define
      .lazy(() => jsonSchema07ObjectItemPropertySchema)
      .optional(),
    required: z.array(z.string()).optional(),
  })
  .meta({ id: 'JsonSchema07NestedObjectItemProperty' })

export const jsonSchema07ObjectItemPropertySchema: z.ZodType<JsonSchema07ObjectItemProperty> =
  z
    .union([
      jsonSchema07PrimitivePropertySchema,
      z.object({
        type: z.literal('array'),
        description: z.string().optional(),
        default: z.array(z.unknown()).optional(),
        items: z.union([
          jsonSchema07ArrayItemPrimitiveSchema,
          z.object({
            type: z.literal('object'),
            properties: z
              .record(
                z.string(),
                z.lazy(() => jsonSchema07ObjectItemPropertySchema),
              )
              .optional(),
            additionalProperties: z
              .lazy(() => jsonSchema07ObjectItemPropertySchema)
              .optional(),
            required: z.array(z.string()).optional(),
          }),
        ]),
        minItems: z.number().int().min(0).optional(),
        maxItems: z.number().int().min(0).optional(),
      }),
      jsonSchema07NestedObjectItemPropertySchema,
    ])
    .meta({ id: 'JsonSchema07ObjectItemProperty' })

/**
 * Schema for object items within arrays.
 * Properties support primitive types and primitive-typed arrays.
 */
export const jsonSchema07ObjectItemSchema = z
  .object({
    type: z.literal('object'),
    properties: z.record(z.string(), jsonSchema07ObjectItemPropertySchema),
    required: z.array(z.string()).optional(),
  })
  .meta({ id: 'JsonSchema07ObjectItem' })

export type JsonSchema07ObjectItem = z.infer<
  typeof jsonSchema07ObjectItemSchema
>

/**
 * Discriminated union of object items — uses a discriminator property
 * to determine which variant's schema applies.
 * Each variant in `oneOf` must define the discriminator as a single-value enum.
 */
export const jsonSchema07DiscriminatedObjectItemSchema = z.object({
  discriminator: z.string(),
  oneOf: z.array(jsonSchema07ObjectItemSchema).min(1),
})

export type JsonSchema07DiscriminatedObjectItem = z.infer<
  typeof jsonSchema07DiscriminatedObjectItemSchema
>

export const jsonSchema07PropertySchema = z
  .union([
    jsonSchema07StringPropertySchema,
    jsonSchema07NumberPropertySchema,
    jsonSchema07IntegerPropertySchema,
    jsonSchema07BooleanPropertySchema,
    z.object({
      type: z.literal('array'),
      description: z.string().optional(),
      default: z.array(z.unknown()).optional(),
      items: z.union([
        jsonSchema07ArrayItemPrimitiveSchema,
        jsonSchema07ObjectItemSchema,
        jsonSchema07DiscriminatedObjectItemSchema,
      ]),
      minItems: z.number().int().min(0).optional(),
      maxItems: z.number().int().min(0).optional(),
    }),
    jsonSchema07NestedObjectItemPropertySchema,
  ])
  .meta({ id: 'JsonSchema07Property' })

/**
 * Valid app settings key format: lowercase letters, digits, and underscores,
 * may not start or end with an underscore. Enforced both at app-install time
 * (on `properties` keys) and at write time (on incoming PATCH values).
 */
export const SETTINGS_KEY_REGEX = /^[a-z0-9](?:[a-z0-9_]*[a-z0-9])?$/

/**
 * Valid `patternProperties` key (the regex string itself). Must be a literal
 * lowercase prefix anchored at start and terminated by an underscore, so that
 * every key it matches is guaranteed to satisfy SETTINGS_KEY_REGEX provided
 * the suffix is also valid. Example: `^provider_`.
 */
export const SETTINGS_PATTERN_PROPERTY_REGEX = /^\^[a-z0-9][a-z0-9_]*_$/

const settingsKeySchema = z
  .string()
  .regex(
    SETTINGS_KEY_REGEX,
    'Setting keys must be lowercase a-z, 0-9, or _ and must not start or end with _',
  )

const settingsPatternPropertyKeySchema = z
  .string()
  .regex(
    SETTINGS_PATTERN_PROPERTY_REGEX,
    'patternProperties keys must be a literal lowercase prefix regex ending with _, e.g. `^provider_`',
  )

export const jsonSchema07ObjectSchema = z
  .object({
    type: z.literal('object'),
    properties: z.record(settingsKeySchema, jsonSchema07PropertySchema),
    patternProperties: z
      .record(settingsPatternPropertyKeySchema, jsonSchema07PropertySchema)
      .optional(),
    required: z.array(settingsKeySchema).optional(),
  })
  .meta({ id: 'JsonSchema07Object' })

export const appSettingsConfigSchema = z
  .object({
    secretKeyPattern: z.string().optional(),
    user: jsonSchema07ObjectSchema.optional(),
    folder: jsonSchema07ObjectSchema.optional(),
  })
  .refine((val) => val.user || val.folder, {
    message: 'At least one of "user" or "folder" must be defined in settings',
  })

export type JsonSchema07Property = z.infer<typeof jsonSchema07PropertySchema>
export type JsonSchema07Object = z.infer<typeof jsonSchema07ObjectSchema>
export type AppSettingsConfig = z.infer<typeof appSettingsConfigSchema>

export const appConfigSchema = z
  .object({
    requiresStorage: z.boolean().optional(),
    permissions: z
      .object({
        core: z.array(coreScopeAppPermissionsSchema).optional(),
        user: z.array(userScopeAppPermissionsSchema).optional(),
        folder: z.array(folderScopeAppPermissionsSchema).optional(),
      })
      .strict()
      .optional(),
    slug: appSlugSchema,
    label: z.string().nonempty().min(1).max(128),
    description: z.string().nonempty().min(1).max(1024),
    icon: iconSchema,
    subscribedCoreEvents: z.array(corePrefixedEventIdentifierSchema).optional(),
    triggers: z.array(taskTriggerConfigSchema).optional(),
    tasks: z.array(taskConfigSchema.strict()).optional(),
    containerProfiles: z
      .record(appProfileIdentifierSchema, containerProfileConfigSchema.strict())
      .optional(),
    runtimeWorkers: z
      .record(workerIdentifierSchema, appRuntimeWorkerConfigSchema.strict())
      .optional(),
    systemRequestRuntimeWorkers: appSystemRequestRuntimeWorkersSchema
      .partial()
      .optional(),
    ui: z
      .object({
        enabled: z.literal(true),
        csp: z.string().optional(),
      })
      .strict()
      .optional(),
    database: z
      .object({
        enabled: z.literal(true),
      })
      .strict()
      .optional(),
    contributions: appContributionsSchema.strict().optional(),
    settings: appSettingsConfigSchema.optional(),
  })
  .strict()
  .meta({ id: 'AppConfig' })
  .superRefine((value, ctx) => {
    // Custom icons require ui.enabled — they're served from the UI bundle.
    const checkCustomIconRequiresUi = (
      icon: Icon | undefined,
      path: (string | number)[],
    ) => {
      if (icon?.source !== 'custom') {
        return
      }
      if (!value.ui?.enabled) {
        ctx.addIssue({
          code: 'custom',
          message:
            "Custom icons require `ui.enabled: true` — they are resolved against the app's UI bundle.",
          path,
        })
      }
    }

    checkCustomIconRequiresUi(value.icon, ['icon'])
    const contributions = value.contributions
    if (contributions) {
      const linkKeys = [
        'sidebarMenuLinks',
        'folderSidebarViews',
        'objectSidebarViews',
        'objectDetailViews',
        'folderDetailViews',
      ] as const
      for (const key of linkKeys) {
        contributions[key].forEach((link, index) => {
          checkCustomIconRequiresUi(link.icon, [
            'contributions',
            key,
            index,
            'icon',
          ])
        })
      }
    }

    const workerIdentifiersArray = Object.keys(value.runtimeWorkers ?? {})
    const workerIdentifiers = new Set(workerIdentifiersArray)

    // `app`-source mobile queries route to a named app runtime worker — verify it exists.
    Object.entries(value.contributions?.mobile?.queries ?? {}).forEach(
      ([queryKey, definition]) => {
        if (
          definition.source === 'app' &&
          !workerIdentifiers.has(definition.worker)
        ) {
          ctx.addIssue({
            code: 'custom',
            message: `Unknown worker "${definition.worker}" in mobile query "${queryKey}". Must be one of: ${workerIdentifiersArray.length > 0 ? workerIdentifiersArray.join(', ') : '(none)'}`,
            path: ['contributions', 'mobile', 'queries', queryKey, 'worker'],
          })
        }
      },
    )

    const taskIdentifiersArray = value.tasks?.map((t) => t.identifier) ?? []
    const taskIdentifiers = new Set(taskIdentifiersArray)
    const containerProfilesKeys = Object.keys(value.containerProfiles ?? {})
    const containerWorkerJobDefinitions = containerProfilesKeys.reduce<
      Record<string, { workerIndex: number; jobIdentifier: string }[]>
    >((acc, profileIdentifier) => {
      const profile = value.containerProfiles?.[profileIdentifier]
      if (!profile) {
        return acc
      }

      const profileJobDefinitions = profile.workers.flatMap(
        (worker, workerIndex) =>
          worker.kind === 'http'
            ? worker.jobs.map(({ identifier: jobIdentifier }) => ({
                workerIndex,
                jobIdentifier,
              }))
            : { workerIndex, jobIdentifier: worker.jobIdentifier },
      )

      return {
        ...acc,
        [profileIdentifier]: profileJobDefinitions,
      }
    }, {})

    Object.entries(containerWorkerJobDefinitions).forEach(
      ([profileIdentifier, jobDefinitions]) => {
        const jobIdentifiers = new Set<string>()

        jobDefinitions.forEach(({ workerIndex, jobIdentifier }) => {
          if (jobIdentifiers.has(jobIdentifier)) {
            ctx.addIssue({
              code: 'custom',
              message: `Duplicate container job name "${jobIdentifier}" in profile "${profileIdentifier}". Each job name within a container profile must be unique.`,
              path: [
                'containerProfiles',
                profileIdentifier,
                'workers',
                workerIndex,
              ],
            })
          } else {
            jobIdentifiers.add(jobIdentifier)
          }
        })
      },
    )

    if (value.systemRequestRuntimeWorkers) {
      for (const key of Object.keys(value.systemRequestRuntimeWorkers)) {
        const systemRequestWorkerIdentifiers =
          value.systemRequestRuntimeWorkers[
            key as keyof typeof value.systemRequestRuntimeWorkers
          ] ?? []
        for (const systemRequestWorkerIdentifier of systemRequestWorkerIdentifiers) {
          if (!workerIdentifiers.has(systemRequestWorkerIdentifier)) {
            ctx.addIssue({
              code: 'custom',
              message: `Unknown worker "${systemRequestWorkerIdentifier}" in systemRequestRuntimeWorkers.${key}. Must be one of: ${workerIdentifiersArray.length > 0 ? workerIdentifiersArray.join(', ') : '(none)'}`,
              path: [
                'systemRequestRuntimeWorkers',
                key,
                systemRequestWorkerIdentifiers.indexOf(
                  systemRequestWorkerIdentifier,
                ),
              ],
            })
          }
        }
      }
    }

    value.tasks?.forEach((task, index) => {
      if (
        task.handler.type === 'runtime' &&
        !workerIdentifiers.has(task.handler.identifier)
      ) {
        ctx.addIssue({
          code: 'custom',
          message: `Unknown worker "${task.handler.identifier}" in task "${task.identifier}". Must be one of: ${workerIdentifiersArray.length > 0 ? workerIdentifiersArray.join(', ') : '(none)'}`,
          path: ['tasks', index, 'worker'],
        })
      } else if (task.handler.type === 'docker') {
        const profile = task.handler.identifier.split(':')[0]
        const jobIdentifier = task.handler.identifier.split(':')[1]
        if (
          // Profile is not defined
          !profile ||
          !containerProfilesKeys.includes(profile)
        ) {
          ctx.addIssue({
            code: 'custom',
            message: `Unknown container profile "${profile}". Must be one of: ${containerProfilesKeys.length > 0 ? containerProfilesKeys.join(', ') : '(none)'}`,
            path: ['tasks', index, 'worker'],
          })
          return
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const profileJobDefinitions = containerWorkerJobDefinitions[profile]!
        if (
          // Job is not defined
          !profileJobDefinitions.some(
            (jobDefinition) =>
              task.handler.type === 'docker' &&
              jobDefinition.jobIdentifier === jobIdentifier,
          )
        ) {
          ctx.addIssue({
            code: 'custom',
            message: `Unknown container job class "${jobIdentifier}". Must be one of: ${profileJobDefinitions.map((jobDefinition) => jobDefinition.jobIdentifier).join(', ')}`,
            path: ['tasks', index, 'worker'],
          })
        }
      }
    })
    const validateOnCompleteTaskIdentifiers = (
      onComplete: {
        taskIdentifier?: string
        onComplete?: TaskOnCompleteConfig[]
      }[],
      triggerIndex: number,
      path: (string | number)[],
    ) => {
      onComplete.forEach((onCompleteConfig, onCompleteIndex) => {
        if (
          onCompleteConfig.taskIdentifier &&
          !taskIdentifiers.has(onCompleteConfig.taskIdentifier)
        ) {
          ctx.addIssue({
            code: 'custom',
            message: `Unknown task "${onCompleteConfig.taskIdentifier}" in trigger at index ${triggerIndex}. Must be one of: ${
              taskIdentifiersArray.length > 0
                ? taskIdentifiersArray.join(', ')
                : '(none)'
            }`,
            path: [...path, onCompleteIndex, 'taskIdentifier'],
          })
        }

        if (onCompleteConfig.onComplete) {
          validateOnCompleteTaskIdentifiers(
            onCompleteConfig.onComplete,
            triggerIndex,
            [...path, onCompleteIndex, 'onComplete'],
          )
        }
      })
    }

    ;(value.triggers ?? []).forEach((trigger, index) => {
      if (
        trigger.kind === 'event' &&
        trigger.eventIdentifier.startsWith(`${CORE_IDENTIFIER}:`) &&
        !value.subscribedCoreEvents?.includes(trigger.eventIdentifier)
      ) {
        ctx.addIssue({
          code: 'custom',
          message: `Platform event identifier "${trigger.eventIdentifier}" in trigger at index ${index} is not subscribed to by the app`,
          path: ['triggers', index, 'eventIdentifier'],
        })
      }

      if (!taskIdentifiers.has(trigger.taskIdentifier)) {
        ctx.addIssue({
          code: 'custom',
          message: `Unknown task "${trigger.taskIdentifier}" in trigger at index ${index}. Must be one of: ${
            taskIdentifiersArray.length > 0
              ? taskIdentifiersArray.join(', ')
              : '(none)'
          }`,
          path: ['triggers', index, 'taskIdentifier'],
        })
      }

      if (trigger.onComplete) {
        validateOnCompleteTaskIdentifiers(trigger.onComplete, index, [
          'triggers',
          index,
          'onComplete',
        ])
      }
    })
  })

// Schema that includes manifest validation for worker entrypoints
const ICON_PATH_BAD_CHARS = /[\\]|\.\.|^\/|^\s|\s$/

const validateIconAssetPaths = (
  icon: Icon | undefined,
  manifest: Record<string, unknown>,
  ctx: z.RefinementCtx,
  zodPath: (string | number)[],
) => {
  if (icon?.source !== 'custom') {
    return
  }
  icon.assets.forEach((asset, index) => {
    const assetPath = asset.path
    if (ICON_PATH_BAD_CHARS.test(assetPath)) {
      ctx.addIssue({
        code: 'custom',
        message: `Icon asset path "${assetPath}" is invalid — paths must be relative, forward-slash separated, and must not contain ".." or leading/trailing whitespace.`,
        path: [...zodPath, 'assets', index, 'path'],
      })
      return
    }
    const manifestKey = `/ui/${assetPath}`
    if (!manifest[manifestKey]) {
      ctx.addIssue({
        code: 'custom',
        message: `Icon asset "${assetPath}" does not exist in the app's UI bundle (expected at "${manifestKey}").`,
        path: [...zodPath, 'assets', index, 'path'],
      })
    }
  })
}

export const appConfigWithManifestSchema = (
  manifest: Record<string, unknown>,
) =>
  appConfigSchema.superRefine((value, ctx) => {
    if (value.runtimeWorkers) {
      Object.entries(value.runtimeWorkers).forEach(
        ([workerId, workerConfig]) => {
          if (!manifest[`/workers/${workerConfig.entrypoint}`]) {
            ctx.addIssue({
              code: 'custom',
              message: `Runtime worker "${workerId}" entrypoint "${workerConfig.entrypoint}" does not exist in manifest`,
              path: ['runtimeWorkers', workerId, 'entrypoint'],
            })
          }
        },
      )
    }

    validateIconAssetPaths(value.icon, manifest, ctx, ['icon'])
    const contributions = value.contributions
    if (contributions) {
      const linkKeys = [
        'sidebarMenuLinks',
        'folderSidebarViews',
        'objectSidebarViews',
        'objectDetailViews',
        'folderDetailViews',
      ] as const
      for (const key of linkKeys) {
        contributions[key].forEach((link, index) => {
          validateIconAssetPaths(link.icon, manifest, ctx, [
            'contributions',
            key,
            index,
            'icon',
          ])
        })
      }
    }
  })

export const appRuntimeWorkersBundleSchema = z.object({
  hash: z.string(),
  size: z.number(),
  manifest: appManifestSchema,
  definitions: z.record(z.string(), appRuntimeWorkerSchema),
})

export const appUiBundleSchema = z.object({
  hash: z.string(),
  size: z.number(),
  csp: z.string().optional(),
  manifest: appManifestSchema,
})

export const appRuntimeWorkersMapSchema = z.record(
  z.string(),
  appRuntimeWorkerSchema,
)

export const appSearchResultItemSchema = z.object({
  folderId: z.guid(),
  objectKey: z.string().nonempty(),
  similarity: z.number().min(0).max(1),
  score: z.number().optional(),
})

export const appSearchResultsSchema = z.array(appSearchResultItemSchema)

export const searchResultItemSchema = appSearchResultItemSchema.extend({
  folderObject: folderObjectSchema,
  folderName: z.string(),
})

export const searchResultsSchema = z.array(searchResultItemSchema)

export type AppSearchResults = z.infer<typeof appSearchResultsSchema>
export type AppSearchResultItem = z.infer<typeof appSearchResultItemSchema>
export type SearchResults = z.infer<typeof searchResultsSchema>
export type SearchResultItem = z.infer<typeof searchResultItemSchema>

export const appRuntimeWorkerScriptIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z_]+$/)

export const appRuntimeWorkerSocketConnectionSchema = z.object({
  appIdentifier: appIdentifierSchema,
  workerId: z.string(),
  socketClientId: z.string(),
  ip: z.string(),
})

export type AppRuntimeWorkerSocketConnection = z.infer<
  typeof appRuntimeWorkerSocketConnectionSchema
>

export const appMetricsSchema = z.object({
  tasksExecutedLast24Hours: z.object({
    completed: z.number(),
    failed: z.number(),
  }),
  errorsLast24Hours: z.object({
    total: z.number(),
    last10Minutes: z.number(),
  }),
  eventsEmittedLast24Hours: z.object({
    total: z.number(),
    last10Minutes: z.number(),
  }),
})

export type AppTaskConfig = z.infer<typeof taskConfigSchema>

export type ContainerTarget = z.infer<typeof containerTargetSchema>

export type ContainerProfileConfig = z.infer<
  typeof containerProfileConfigSchema
>

export type ContainerProfileJobDefinition = z.infer<
  typeof containerProfileJobDefinitionSchema
>

export type ContainerProfileResourceHints = z.infer<
  typeof containerProfileResourceHintsSchema
>

export type AppRuntimeWorkersBundle = z.infer<
  typeof appRuntimeWorkersBundleSchema
>

export type AppUILink = z.infer<typeof appUILinkSchema>

export type AppConfig = z.infer<typeof appConfigSchema>

export type AppRuntimeWorker = z.infer<typeof appRuntimeWorkerSchema>

export type AppRuntimeWorkersMap = z.infer<typeof appRuntimeWorkersMapSchema>

export type AppManifest = z.infer<typeof appManifestSchema>

export type AppContributions = z.infer<typeof appContributionsSchema>

export type MobileDynamicString = z.infer<typeof mobileDynamicStringSchema>

export type MobileAccessibility = z.infer<typeof mobileAccessibilitySchema>

export type MobileEvent = z.infer<typeof mobileEventSchema>

export type MobileAction = z.infer<typeof mobileActionSchema>

export type MobileComponent = z.infer<typeof mobileComponentSchema>

export type MobileQueryDefinition = z.infer<typeof mobileQueryDefinitionSchema>

export type MobileQueries = z.infer<typeof mobileQueriesSchema>

export type MobileQueryRef = z.infer<typeof mobileQueryRefSchema>

export type MobileQueryBinding = z.infer<typeof mobileQueryBindingSchema>

export type MobileRootView = z.infer<typeof mobileRootViewSchema>

export type MobileRoot = z.infer<typeof mobileRootSchema>

export type MobileContributions = z.infer<typeof mobileContributionsSchema>

export type AppMetrics = z.infer<typeof appMetricsSchema>

export type AppUiBundle = z.infer<typeof appUiBundleSchema>
