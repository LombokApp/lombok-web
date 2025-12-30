import type { JsonSerializableValue } from '@lombokapp/types'
import { jsonSerializableValueSchema } from '@lombokapp/types'

// jsonbProtections.ts
export type IllegalJsonReason =
  | 'nul_in_string'
  | 'control_char_in_string'
  | 'binary_not_allowed'
  | 'non_finite_number'
  | 'circular_reference'
  | 'unsupported_type'

export interface IllegalJsonFinding {
  path: string // JSONPath-ish: $.a[0].b
  reason: IllegalJsonReason
  detail?: string
}

export interface SanitizeOptions {
  /**
   * Replace NUL with this token. If null, throw instead of replacing.
   * Postgres cannot store NUL in text/json/jsonb strings.
   */
  nulReplacement?: string | null // default "[NUL]"

  /**
   * What to do with ASCII control characters (0x01-0x1F) other than \t \n \r and NUL:
   * - "escape": replace with a literal \uXXXX sequence
   * - "strip": remove them
   * - "keep": leave them (not recommended if you have unknown producers)
   */
  controlCharMode?: 'escape' | 'strip' | 'keep' // default "escape"

  /**
   * Disallow Buffer/TypedArray/ArrayBuffer/DataView if true.
   * If false, you can decide to transform binary yourself elsewhere.
   */
  disallowBinary?: boolean // default true
}

function isBinaryLike(v: unknown): boolean {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(v)) {
    return true
  }

  return (
    v instanceof Uint8Array ||
    v instanceof ArrayBuffer ||
    v instanceof DataView ||
    v instanceof Int8Array ||
    v instanceof Uint16Array ||
    v instanceof Int16Array ||
    v instanceof Uint32Array ||
    v instanceof Int32Array ||
    v instanceof Float32Array ||
    v instanceof Float64Array ||
    (typeof BigInt64Array !== 'undefined' && v instanceof BigInt64Array) ||
    (typeof BigUint64Array !== 'undefined' && v instanceof BigUint64Array)
  )
}

function hasNul(s: string): boolean {
  return s.includes('\u0000')
}

function findOtherControlChar(s: string): string | null {
  // Exclude: NUL handled separately, and allow \t \n \r
  // eslint-disable-next-line no-control-regex
  const re = /[\u0001-\u0008\u000B\u000C\u000E-\u001F]/
  const m = s.match(re)
  return m ? m[0] : null
}

/**
 * Finds the first illegal value for JSONB storage under a Postgres-safe policy.
 * Returns null if everything looks OK.
 */
export function findIllegalJsonChars(
  value: unknown,
  options: SanitizeOptions = {},
  path = '$',
  seen = new WeakSet(),
): IllegalJsonFinding | null {
  const { disallowBinary = true } = options

  if (value === null) {
    return null
  }

  const valueTypeof = typeof value

  if (valueTypeof === 'string') {
    if (hasNul(value as string)) {
      return { path, reason: 'nul_in_string' }
    }
    const ctrl = findOtherControlChar(value as string)
    if (ctrl) {
      return {
        path,
        reason: 'control_char_in_string',
        detail: `U+${ctrl.charCodeAt(0).toString(16).padStart(4, '0')}`,
      }
    }
    return null
  }

  if (valueTypeof === 'number') {
    if (!Number.isFinite(value)) {
      return { path, reason: 'non_finite_number' }
    }
    return null
  }

  if (valueTypeof === 'boolean') {
    return null
  }

  if (
    valueTypeof === 'bigint' ||
    valueTypeof === 'symbol' ||
    valueTypeof === 'function' ||
    valueTypeof === 'undefined'
  ) {
    return { path, reason: 'unsupported_type', detail: valueTypeof }
  }

  if (value instanceof Date) {
    // Date is fine if you serialize it; not inherently illegal chars.
    return null
  }

  if (disallowBinary && isBinaryLike(value)) {
    return { path, reason: 'binary_not_allowed' }
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const f = findIllegalJsonChars(value[i], options, `${path}[${i}]`, seen)
      if (f) {
        return f
      }
    }
    return null
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (valueTypeof === 'object') {
    const obj = value as Record<string, unknown>
    if (seen.has(obj)) {
      return { path, reason: 'circular_reference' }
    }
    seen.add(obj)

    for (const [k, v] of Object.entries(obj)) {
      const f = findIllegalJsonChars(v, options, `${path}.${k}`, seen)
      if (f) {
        return f
      }
    }

    seen.delete(obj)
    return null
  }

  return { path, reason: 'unsupported_type' }
}

function sanitizeStringForPg(s: string, options: SanitizeOptions): string {
  const { nulReplacement = '[NUL]', controlCharMode = 'escape' } = options

  let _s = s
  // NUL
  if (hasNul(s)) {
    if (nulReplacement === null) {
      throw new Error('NUL character not allowed in jsonb strings')
    }
    // eslint-disable-next-line no-control-regex
    _s = s.replace(/\u0000/g, nulReplacement)
  }

  // Other control chars
  if (controlCharMode === 'keep') {
    return _s
  }

  if (controlCharMode === 'strip') {
    // eslint-disable-next-line no-control-regex
    return _s.replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  }

  // "escape"
  // eslint-disable-next-line no-control-regex
  return _s.replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, (c) => {
    return `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`
  })
}

/**
 * Deep-sanitizes JSON-ish data for Postgres JSONB storage.
 * - Replaces/throws on NUL in strings
 * - Escapes/strips other control chars
 * - Optionally rejects binary types
 * - Rejects non-finite numbers and circular references
 */
export function sanitizeJsonForJSONB(
  value: JsonSerializableValue,
  options: SanitizeOptions = {},
  path = '$',
  seen = new WeakSet(),
): unknown {
  const parsedValue = jsonSerializableValueSchema.safeParse(value)
  if (!parsedValue.success) {
    throw new Error(`Invalid JSON value at ${path}`)
  }

  const { disallowBinary = true } = options

  if (value === null) {
    return null
  }

  const valueTypeof = typeof value

  if (valueTypeof === 'string') {
    return sanitizeStringForPg(value as string, options)
  }

  if (valueTypeof === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Non-finite number not allowed at ${path}`)
    }
    return value
  }

  if (valueTypeof === 'boolean') {
    return value
  }

  if (
    valueTypeof === 'bigint' ||
    valueTypeof === 'symbol' ||
    valueTypeof === 'function' ||
    valueTypeof === 'undefined'
  ) {
    throw new Error(`Unsupported type "${valueTypeof}" at ${path}`)
  }

  if (value instanceof Date) {
    // Leave Dates as-is; your custom type can serialize them (or you can convert here).
    return value
  }

  if (disallowBinary && isBinaryLike(value)) {
    throw new Error(`Binary value not allowed at ${path}`)
  }

  if (Array.isArray(value)) {
    return value.map((v, i) =>
      sanitizeJsonForJSONB(v, options, `${path}[${i}]`, seen),
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (valueTypeof === 'object') {
    const obj = value as Record<string, unknown>
    if (seen.has(obj)) {
      throw new Error(`Circular reference not allowed at ${path}`)
    }
    seen.add(obj)

    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      out[k] = sanitizeJsonForJSONB(
        v as JsonSerializableValue,
        options,
        `${path}.${k}`,
        seen,
      )
    }

    seen.delete(obj)
    return out
  }

  throw new Error(`Unsupported value at ${path}`)
}
