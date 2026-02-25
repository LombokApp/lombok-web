import type { JsonSerializableObject, TaskUpdate } from '@lombokapp/types'
import { evalCondition } from 'src/util/eval-condition.util'

/**
 * Evaluates an onUpdate condition expression against a worker update and job input context.
 *
 * @param condition - The condition expression to evaluate (e.g., "update.code === 'progress'")
 * @param update - The worker update payload
 * @param jobInput - The task's data (job input context)
 * @returns true if the condition evaluates to truthy, false otherwise
 */
export const evalUpdateHandlerCondition = (
  condition: string,
  update: TaskUpdate,
  jobInput: JsonSerializableObject,
): boolean => {
  return evalCondition(condition, { update, jobInput })
}
