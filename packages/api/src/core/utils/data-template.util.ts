import type {
  JsonSerializableObject,
  JsonSerializableValue,
} from '@lombokapp/types'
import { validateConditionExpression } from '@lombokapp/types'
import { EvalAstFactory, parse } from 'jexpr'

const TEMPLATE_EXPRESSION = /\{\{\s*(?<expression>.+?)\s*(?<!\{)\}\}/g
const FUNCTION_EXPRESSION = /^(?<functionName>[a-zA-Z_][\w]*)\((?<args>.*)\)$/
const STRING_LITERAL = /^(['"])(?<literal>.*)\1$/

const astFactory = new EvalAstFactory()

type AvailableFunctions = Record<
  string,
  (
    ...args: (JsonSerializableValue | undefined)[]
  ) => JsonSerializableValue | Promise<JsonSerializableValue>
>

function isJsonValue(v: unknown): v is JsonSerializableValue {
  if (v === null) {
    return true
  }
  const t = typeof v
  if (t === 'string' || t === 'number' || t === 'boolean') {
    return true
  }

  if (Array.isArray(v)) {
    return v.every(isJsonValue)
  }

  if (t === 'object') {
    // “plain object” check (exclude Date, Map, class instances, etc.)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const proto = Object.getPrototypeOf(v)
    if (proto !== Object.prototype && proto !== null) {
      return false
    }

    for (const val of Object.values(v as Record<string, unknown>)) {
      if (!isJsonValue(val)) {
        return false
      }
    }
    return true
  }

  return false // undefined, function, symbol, bigint, etc.
}

function getValueAtPath(
  source: Record<string, unknown>,
  path: string,
): { value: JsonSerializableValue | undefined; found: boolean } {
  const segments = path
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)

  let current: unknown = source
  for (const segment of segments) {
    if (
      current !== null &&
      typeof current === 'object' &&
      Object.prototype.hasOwnProperty.call(current, segment)
    ) {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return { value: undefined, found: false }
    }
  }

  return { value: current as JsonSerializableValue, found: true }
}

async function resolveTemplateExpression(
  expression: string,
  inputs: {
    objects: Record<string, unknown>
    functions: AvailableFunctions
  } = {
    objects: {},
    functions: {},
  },
  {
    validate,
  }: {
    validate: boolean
  } = {
    validate: false,
  },
): Promise<JsonSerializableValue | undefined> {
  // Check if it's a function call first
  const functionMatch = expression.match(FUNCTION_EXPRESSION)
  const functionName = functionMatch?.groups?.functionName

  if (functionName) {
    const fn = inputs.functions[functionName]
    if (!fn) {
      if (validate) {
        throw new Error(`Function "${functionName}" is not recognized`)
      }
      return undefined
    }

    const argsSection = functionMatch.groups?.args?.trim() ?? ''
    const args =
      argsSection.length === 0
        ? []
        : argsSection
            .split(',')
            .map((arg) => arg.trim())
            .filter(Boolean)
            .map((rawArg) => {
              const stringMatch = rawArg.match(STRING_LITERAL)
              if (stringMatch?.groups?.literal !== undefined) {
                return stringMatch.groups.literal as JsonSerializableValue
              }

              // For function arguments, try to evaluate as expression first, then fall back to path lookup
              try {
                const validation = validateConditionExpression(rawArg)
                if (validation.valid) {
                  const parsedExpr = parse(rawArg, astFactory)
                  const result: unknown = parsedExpr?.evaluate(inputs.objects)
                  if (
                    result !== undefined &&
                    result !== null &&
                    isJsonValue(result)
                  ) {
                    return result
                  }
                }
              } catch {
                // Fall through to path lookup
              }

              const { value, found } = getValueAtPath(inputs.objects, rawArg)
              if (validate && !found) {
                throw new Error(`Template variable not found: ${rawArg}`)
              }
              return found ? value : undefined
            })

    const fnResult = fn(...args)
    if (
      fnResult !== null &&
      typeof fnResult === 'object' &&
      typeof (fnResult as { then?: unknown }).then === 'function'
    ) {
      return (fnResult as Promise<JsonSerializableValue>).then(
        (result) => result,
      )
    }
    return fnResult
  }

  // Try to evaluate as a jexpr expression first
  const validation = validateConditionExpression(expression)
  if (validation.valid) {
    try {
      const parsedExpr = parse(expression, astFactory)
      const result: unknown = parsedExpr?.evaluate(inputs.objects)
      if (result !== undefined && result !== null && isJsonValue(result)) {
        return result
      }
    } catch {
      // Fall through to path lookup if expression evaluation fails
    }
  }

  // Fall back to simple path lookup for backward compatibility
  const { value, found } = getValueAtPath(inputs.objects, expression)
  if (validate && !found) {
    throw new Error(`Template variable not found: ${expression}`)
  }

  return found ? value : undefined
}

type FilterMode = 'include' | 'exclude'

interface KeyFilterRule {
  path: string[]
  mode: FilterMode
}

interface KeyFilter {
  defaultMode: FilterMode
  rules: KeyFilterRule[]
}

function pathEquals(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}

function isPrefixOrEqual(prefix: string[], path: string[]): boolean {
  if (prefix.length > path.length) {
    return false
  }
  for (let i = 0; i < prefix.length; i++) {
    if (prefix[i] !== path[i]) {
      return false
    }
  }
  return true
}

function isStrictPrefix(prefix: string[], path: string[]): boolean {
  return prefix.length < path.length && isPrefixOrEqual(prefix, path)
}

function buildKeyFilter(
  onlyKeys: string[][] | undefined,
  omitKeys: string[][] | undefined,
): KeyFilter | undefined {
  const hasOnly = !!onlyKeys && onlyKeys.length > 0
  const hasOmit = !!omitKeys && omitKeys.length > 0
  if (!hasOnly && !hasOmit) {
    return undefined
  }

  if (hasOnly && hasOmit) {
    for (const o of onlyKeys) {
      for (const x of omitKeys) {
        if (pathEquals(o, x)) {
          throw new Error(
            `dataFromTemplate: path [${o.join('.')}] appears in both onlyKeys and omitKeys`,
          )
        }
      }
    }
  }

  const rules: KeyFilterRule[] = []
  if (hasOnly) {
    for (const p of onlyKeys) {
      rules.push({ path: p, mode: 'include' })
    }
  }
  if (hasOmit) {
    for (const p of omitKeys) {
      rules.push({ path: p, mode: 'exclude' })
    }
  }

  return {
    // If onlyKeys is provided, the default is to exclude everything not listed.
    // With only omitKeys, the default is to include everything not listed.
    defaultMode: hasOnly ? 'exclude' : 'include',
    rules,
  }
}

function effectiveMode(filter: KeyFilter, path: string[]): FilterMode {
  let longest: KeyFilterRule | null = null
  for (const rule of filter.rules) {
    if (
      isPrefixOrEqual(rule.path, path) &&
      (!longest || rule.path.length > longest.path.length)
    ) {
      longest = rule
    }
  }
  return longest ? longest.mode : filter.defaultMode
}

function decideKey(
  filter: KeyFilter,
  newPath: string[],
): 'resolveAll' | 'passthrough' | 'recurse' {
  const hasDeeper = filter.rules.some((r) => isStrictPrefix(newPath, r.path))
  if (hasDeeper) {
    return 'recurse'
  }
  return effectiveMode(filter, newPath) === 'include'
    ? 'resolveAll'
    : 'passthrough'
}

async function resolveValue<
  T = JsonSerializableValue,
  R extends T | JsonSerializableObject = T | JsonSerializableObject,
>(
  value: T,
  inputs: { objects: Record<string, unknown>; functions: AvailableFunctions },
  validate: boolean,
  filter?: KeyFilter,
  path: string[] = [],
): Promise<R> {
  if (Array.isArray(value)) {
    return Promise.all(
      value.map((entry) => resolveValue(entry, inputs, validate, filter, path)),
    ) as R
  }

  if (value !== null && typeof value === 'object') {
    const resolvedObject: JsonSerializableObject = {}
    for (const [key, entry] of Object.entries(
      value as JsonSerializableObject,
    )) {
      const newPath = [...path, key]
      const decision = filter ? decideKey(filter, newPath) : 'resolveAll'
      if (decision === 'passthrough') {
        resolvedObject[key] = entry
      } else if (decision === 'resolveAll') {
        resolvedObject[key] = await resolveValue(entry, inputs, validate)
      } else {
        resolvedObject[key] = await resolveValue(
          entry,
          inputs,
          validate,
          filter,
          newPath,
        )
      }
    }
    return resolvedObject as R
  }

  // Primitive reached while filter is still in "recurse" mode: deeper rules
  // can't apply to a leaf, so honour the effective mode at this path.
  if (filter && effectiveMode(filter, path) === 'exclude') {
    return value as R
  }

  if (typeof value === 'string') {
    // Find all template expressions in the string
    const matches = Array.from(value.matchAll(TEMPLATE_EXPRESSION))

    if (matches.length === 0) {
      return value as R
    }

    // If the entire string is a single template expression, return the resolved value directly
    const firstMatch = matches[0]
    if (
      matches.length === 1 &&
      firstMatch?.[0] &&
      firstMatch[0] === value.trim() &&
      firstMatch.groups?.expression
    ) {
      const resolved = await resolveTemplateExpression(
        firstMatch.groups.expression,
        inputs,
        { validate },
      )
      return (resolved === undefined ? null : resolved) as R
    }

    // Multiple template expressions - resolve each and concatenate
    let result = value as string
    for (const match of matches) {
      const expression = match.groups?.expression
      const matchString = match[0]
      if (expression && matchString) {
        const resolved = await resolveTemplateExpression(expression, inputs, {
          validate,
        })
        let resolvedStr = ''
        if (resolved !== undefined && resolved !== null) {
          if (typeof resolved === 'object') {
            resolvedStr = JSON.stringify(resolved)
          } else {
            resolvedStr = String(resolved)
          }
        }
        result = result.replace(matchString, resolvedStr)
      }
    }
    return result as R
  }

  return value as R
}

export async function dataFromTemplate(
  data: Record<string, JsonSerializableValue | undefined>,
  {
    objects = {},
    functions = {},
  }: {
    objects?: Record<string, unknown>
    functions?: AvailableFunctions
  } = {
    objects: {},
    functions: {},
  },
  options: {
    validate?: boolean
    onlyKeys?: string[][]
    omitKeys?: string[][]
  } = {},
): Promise<JsonSerializableObject> {
  if (!isJsonValue(data)) {
    throw new Error('Data is not a valid JSON value')
  }

  const validate = options.validate ?? false
  const filter = buildKeyFilter(options.onlyKeys, options.omitKeys)

  const resolved = await resolveValue(
    data,
    { objects, functions },
    validate,
    filter,
    [],
  )
  return resolved
}
