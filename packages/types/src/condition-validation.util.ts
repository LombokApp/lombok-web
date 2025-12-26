/**
 * Security validation for condition expressions.
 * Blocks constructor access patterns that could be used for prototype pollution.
 *
 * This validation is applied at the schema level to prevent dangerous conditions
 * from being stored in app configurations.
 */
export function validateConditionExpression(condition: string): {
  valid: boolean
  error?: string
} {
  const trimmed = condition.trim()
  if (!trimmed) {
    return { valid: false, error: 'Condition cannot be empty' }
  }

  // Block constructor access patterns that could lead to prototype pollution
  if (/\.constructor\b/.test(trimmed)) {
    return {
      valid: false,
      error:
        'Condition cannot contain constructor access (security restriction)',
    }
  }

  return { valid: true }
}
