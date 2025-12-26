import type { JsonSerializableObject } from '@lombokapp/types'
import { evalCondition } from 'src/util/eval-condition.util'

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

/**
 * Evaluates an onComplete condition expression against a task context.
 *
 * @param condition - The condition expression to evaluate (e.g., "task.success")
 * @param task - The task context to evaluate the condition against
 * @returns true if the condition evaluates to truthy, false otherwise
 */
export const evalOnCompleteHandlerCondition = (
  condition: string,
  task: OnCompleteConditionTaskContext,
): boolean => {
  return evalCondition(condition, { task })
}
