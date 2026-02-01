import { CoreEvent } from '@lombokapp/types'

const EVENT_TYPE_LABELS: Record<string, string> = {
  [CoreEvent.object_added]: 'Object added',
  [CoreEvent.object_removed]: 'Object removed',
  [CoreEvent.object_updated]: 'Object updated',
  [CoreEvent.folder_scanned]: 'Folder scanned',
  [CoreEvent.serverless_task_enqueued]: 'Task enqueued',
  [CoreEvent.docker_task_enqueued]: 'Task enqueued',
  [CoreEvent.new_user_registered]: 'New user registered',
}

/**
 * Humanize event identifier for notification display.
 * Handles known CoreEvent values and falls back to title case formatting.
 */
export function formatNotificationTitle(
  eventIdentifier: string,
  _emitterIdentifier?: string,
): string {
  const label = EVENT_TYPE_LABELS[eventIdentifier]
  if (label) {
    return label
  }
  return eventIdentifier
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
