const MASKED_VALUE = '********'

export function isSecretKey(
  key: string,
  secretKeyPattern: string | undefined,
): boolean {
  if (!secretKeyPattern) {
    return false
  }
  return new RegExp(secretKeyPattern).test(key)
}

// Masks leaves under a secret-matched key while preserving object/array shape, so the settings UI can still render and round-trip edits.
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

// Masks secret values in a settings object for GET responses, including nested objects and arrays-of-objects.
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
