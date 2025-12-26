import type {
  JsonSerializableObject,
  JsonSerializableValue,
} from '@lombokapp/types'
import { validateConditionExpression } from '@lombokapp/types'
import { EvalAstFactory, parse } from 'jexpr'

const TEMPLATE_EXPRESSION = /\{\{\s*(?<expression>.+?)\s*\}\}/g
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
    if (fnResult instanceof Promise) {
      return fnResult.then((result) => result)
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

async function resolveValue(
  value: JsonSerializableValue,
  inputs: { objects: Record<string, unknown>; functions: AvailableFunctions },
  validate: boolean,
): Promise<JsonSerializableValue> {
  if (typeof value === 'string') {
    // Find all template expressions in the string
    const matches = Array.from(value.matchAll(TEMPLATE_EXPRESSION))

    if (matches.length === 0) {
      return value
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
      return resolved === undefined ? null : resolved
    }

    // Multiple template expressions - resolve each and concatenate
    let result = value
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
    return result
  }

  if (Array.isArray(value)) {
    return Promise.all(
      value.map((entry) => resolveValue(entry, inputs, validate)),
    )
  }

  if (value !== null && typeof value === 'object') {
    const resolvedObject: JsonSerializableObject = {}
    for (const [key, entry] of Object.entries(value)) {
      resolvedObject[key] = await resolveValue(entry, inputs, validate)
    }
    return resolvedObject
  }

  return value
}

export async function dataFromTemplate(
  data: Record<string, JsonSerializableValue>,
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
  options = { validate: false },
): Promise<JsonSerializableObject> {
  if (!isJsonValue(data)) {
    throw new Error('Data is not a valid JSON value')
  }

  const parsedData: JsonSerializableObject = {}
  for (const [key, value] of Object.entries(data)) {
    parsedData[key] = await resolveValue(
      value,
      { objects, functions },
      options.validate,
    )
  }

  return parsedData
}
