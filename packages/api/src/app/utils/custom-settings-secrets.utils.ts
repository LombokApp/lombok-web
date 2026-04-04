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

/**
 * Restore masked secrets within an array of objects using index-based matching
 * against the existing array. Items at the same index have their masked secrets
 * replaced with the existing value.
 */
function mergeArraySecrets(
  incomingArr: unknown[],
  existingArr: unknown[],
  secretKeyPattern: string,
): unknown[] {
  return incomingArr.map((item, index) => {
    if (item == null || typeof item !== 'object' || Array.isArray(item)) {
      return item
    }
    const existingItem =
      index < existingArr.length ? existingArr[index] : undefined
    if (
      existingItem == null ||
      typeof existingItem !== 'object' ||
      Array.isArray(existingItem)
    ) {
      return item
    }
    const merged: Record<string, unknown> = {}
    const incoming = item as Record<string, unknown>
    const existing = existingItem as Record<string, unknown>
    for (const [key, value] of Object.entries(incoming)) {
      if (value === MASKED_VALUE && isSecretKey(key, secretKeyPattern)) {
        merged[key] = existing[key] ?? value
      } else {
        merged[key] = value
      }
    }
    return merged
  })
}

/**
 * Merge incoming values with existing stored values, preserving secrets
 * when the incoming value is the masked placeholder.
 * Returns null for keys where the incoming value is explicitly null (key removal).
 * Handles secrets nested inside array-of-objects via index-based matching.
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
    } else if (
      Array.isArray(value) &&
      secretKeyPattern &&
      Array.isArray(existing[key])
    ) {
      // Restore masked secrets inside array-of-objects
      result[key] = mergeArraySecrets(
        value,
        existing[key] as unknown[],
        secretKeyPattern,
      )
    } else {
      result[key] = value
    }
  }

  return result
}
