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

function maskObjectItem(
  item: Record<string, unknown>,
  secretKeyPattern: string,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(item)) {
    result[key] = isSecretKey(key, secretKeyPattern) ? MASKED_VALUE : value
  }
  return result
}

/**
 * Mask a single value — if it's an array of objects, mask secret keys within each item.
 */
function maskValue(
  key: string,
  value: unknown,
  secretKeyPattern: string,
): unknown {
  if (isSecretKey(key, secretKeyPattern)) {
    return MASKED_VALUE
  }
  if (Array.isArray(value)) {
    return value.map((item: unknown) => {
      if (item != null && typeof item === 'object' && !Array.isArray(item)) {
        return maskObjectItem(item as Record<string, unknown>, secretKeyPattern)
      }
      return item
    })
  }
  return value
}

/**
 * Mask secret values in a settings object for GET responses.
 * Handles top-level secrets and secrets nested inside array-of-objects.
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
    result[key] = maskValue(key, value, secretKeyPattern)
  }
  return result
}
