import type { EventNotificationAggregationConfig } from '@lombokapp/types'
import { CoreEvent, EventNotificationAggregationScope } from '@lombokapp/types'

/**
 * Static batching configuration per event type.
 * Maps event identifier to batching configuration.
 *
 * Configuration options:
 * - notificationsEnabled: If false, no notifications will be generated for this event type
 * - debounceSeconds: Wait for quiet-time before flushing (0 = flush immediately)
 * - maxIntervalSeconds: Optional maximum time to wait before flushing (prevents indefinite deferral)
 */
const eventAggregationConfig: Record<
  CoreEvent,
  EventNotificationAggregationConfig
> = {
  [CoreEvent.object_added]: {
    notificationsEnabled: true,
    aggregationScope: EventNotificationAggregationScope.FOLDER,
    debounceSeconds: 5,
    maxIntervalSeconds: 60,
  },
  [CoreEvent.object_removed]: {
    notificationsEnabled: true,
    aggregationScope: EventNotificationAggregationScope.FOLDER,
    debounceSeconds: 5,
    maxIntervalSeconds: 60,
  },
  [CoreEvent.object_updated]: {
    notificationsEnabled: true,
    aggregationScope: EventNotificationAggregationScope.FOLDER,
    debounceSeconds: 5,
    maxIntervalSeconds: 60,
  },
  [CoreEvent.folder_scanned]: {
    notificationsEnabled: true,
    aggregationScope: EventNotificationAggregationScope.FOLDER,
    debounceSeconds: 5,
    maxIntervalSeconds: 60,
  },
  [CoreEvent.serverless_task_enqueued]: {
    notificationsEnabled: false,
  },
  [CoreEvent.docker_task_enqueued]: {
    notificationsEnabled: false,
  },
  [CoreEvent.new_user_registered]: {
    notificationsEnabled: false,
  },
}

/**
 * Get batching configuration for an event identifier.
 * Returns null if no configuration exists (notifications disabled by default).
 */
export function getCoreEventAggregationConfig(
  eventIdentifier: CoreEvent,
): EventNotificationAggregationConfig | undefined {
  return eventAggregationConfig[eventIdentifier]
}

export type { EventNotificationAggregationConfig as EventAggregationConfig }
