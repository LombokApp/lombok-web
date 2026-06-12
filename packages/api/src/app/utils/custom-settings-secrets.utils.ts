const MASKED_VALUE = '********'

/**
 * Check if a key matches the secret key pattern.
 */
export function isSecretKey(
  key: string,
  secretKeyPattern: string | undefined,
): boolean {
  if (!secretKeyPattern) {
    return false
  }
  return new RegExp(secretKeyPattern).test(key)
}

/**
 * Recursively mask a value, preserving structure. A leaf is masked when it sits
 * under a secret-matched key — either the top-level key, or any object key along
 * the way. Keeping the surrounding object/array shape intact (rather than
 * collapsing a secret object to a bare sentinel) lets the settings UI keep
 * rendering its editor and round-trip edits in the schema's expected shape.
 */
function maskDeep(
  value: unknown,
  secret: boolean,
  secretKeyPattern: string,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => maskDeep(item, secret, secretKeyPattern))
  }
  if (value != null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value)) {
      result[key] = maskDeep(
        child,
        secret || isSecretKey(key, secretKeyPattern),
        secretKeyPattern,
      )
    }
    return result
  }
  return secret ? MASKED_VALUE : value
}

/**
 * Mask secret values in a settings object for GET responses. Handles top-level
 * secrets as well as secrets nested inside objects and arrays-of-objects.
 */
export function maskSecretValues(
  values: Record<string, unknown>,
  secretKeyPattern: string | undefined,
): Record<string, unknown> {
  if (!secretKeyPattern) {
    return values
  }
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(values)) {
    result[key] = maskDeep(
      value,
      isSecretKey(key, secretKeyPattern),
      secretKeyPattern,
    )
  }
  return result
}
