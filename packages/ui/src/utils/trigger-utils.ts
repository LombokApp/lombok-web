/**
 * Type representing a configurable trigger from the API response.
 * This matches the structure returned by the server apps API.
 */
type ConfigurableTrigger =
  | {
      kind: 'event'
      eventIdentifier: string
      taskIdentifier: string
      dataTemplate?: Record<string, unknown>
      onComplete?: unknown[]
    }
  | {
      kind: 'schedule'
      config: {
        interval: number
        unit: 'minutes' | 'hours' | 'days'
      }
      taskIdentifier: string
      onComplete?: unknown[]
    }
  | {
      kind: 'user_action'
      taskIdentifier: string
      scope?: {
        user?: {
          permissions: string
        }
        folder?: {
          folderId: string
        }
      }
      onComplete?: unknown[]
    }

/**
 * Creates a human-readable string representation of a configurable trigger.
 * Handles three types of triggers: event, schedule, and user_action.
 *
 * @param trigger - The trigger configuration object
 * @returns A human-readable string describing the trigger
 */
export function formatTriggerLabel(trigger: ConfigurableTrigger): string {
  if (trigger.kind === 'event') {
    return `event (${trigger.eventIdentifier})`
  }

  if (trigger.kind === 'schedule') {
    const { interval, unit } = trigger.config
    const unitLabel = interval === 1 ? unit.slice(0, -1) : unit
    return `schedule (every ${interval} ${unitLabel})`
  }

  // trigger.kind === 'user_action'
  return 'user_action'
}
