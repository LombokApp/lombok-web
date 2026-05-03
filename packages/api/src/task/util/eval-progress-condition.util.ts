import type {
  JsonSerializableObject,
  TaskProgressReport,
} from '@lombokapp/types'
import { evalCondition } from 'src/util/eval-condition.util'

/**
 * Evaluates an onProgress condition expression against a worker progress
 * report and the task's job input context.
 *
 * @param condition - The condition expression to evaluate (e.g., "progressReport.code === 'session-started'")
 * @param progressReport - The worker-originated progress report payload
 * @param jobInput - The task's data (job input context)
 * @returns true if the condition evaluates to truthy, false otherwise
 */
export const evalProgressHandlerCondition = (
  condition: string,
  progressReport: TaskProgressReport,
  jobInput: JsonSerializableObject,
): boolean => {
  return evalCondition(condition, { progressReport, jobInput })
}
