import type { Event } from 'src/event/entities/event.entity'
import { evalCondition } from 'src/util/eval-condition.util'

/**
 * Evaluates a trigger condition expression against an event.
 *
 * @param condition - The condition expression to evaluate (e.g., "event.data.mediaType === 'IMAGE'")
 * @param event - The event to evaluate the condition against
 * @returns true if the condition evaluates to truthy, false otherwise
 */
export const evalTriggerHandlerCondition = (
  condition: string,
  event: Event,
): boolean => {
  return evalCondition(condition, { event })
}
