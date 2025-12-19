import type { JsonSerializableObject } from '@lombokapp/types'

export type OnCompleteConditionTaskContext =
  | {
      id: string
      success: true
      result: JsonSerializableObject
    }
  | {
      id: string
      success: false
      error: {
        code: string
        message: string
        details?: JsonSerializableObject
      }
    }

export const evalOnCompleteHandlerCondition = (
  condition: string,
  task: OnCompleteConditionTaskContext,
): boolean => {
  const trimmed = condition.trim()
  if (!trimmed) {
    return false
  }

  const negate = trimmed.startsWith('!')
  const expression = negate ? trimmed.slice(1).trim() : trimmed
  if (!expression) {
    return false
  }

  const path = expression.split('.').filter(Boolean)
  if (path.length === 0) {
    return false
  }

  let current: unknown = { task }

  for (const segment of path) {
    if (
      current &&
      typeof current === 'object' &&
      segment in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[segment]
    } else {
      current = undefined
      break
    }
  }

  const truthy = Boolean(current)
  return negate ? !truthy : truthy
}
