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
 * Mask secret values in a settings object for GET responses.
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
    result[key] = isSecretKey(key, secretKeyPattern) ? MASKED_VALUE : value
  }
  return result
}

/**
 * Merge incoming values with existing stored values, preserving secrets
 * when the incoming value is the masked placeholder.
 * Returns null for keys where the incoming value is explicitly null (key removal).
 */
export function mergeWithSecretPreservation(
  incoming: Record<string, unknown>,
  existing: Record<string, unknown>,
  secretKeyPattern: string | undefined,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...existing }

  for (const [key, value] of Object.entries(incoming)) {
    if (value === null) {
      // Explicit null means remove this key
      if (key in result) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete result[key]
      }
    } else if (value === MASKED_VALUE && isSecretKey(key, secretKeyPattern)) {
      // Preserve existing value when masked placeholder is sent
      // (keep whatever is in result from the spread of existing)
    } else {
      result[key] = value
    }
  }

  return result
}
