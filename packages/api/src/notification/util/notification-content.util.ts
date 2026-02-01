import { CoreEvent } from '@lombokapp/types'
import { encodeS3ObjectKey } from '@lombokapp/utils'
import type { Event } from 'src/event/entities/event.entity'

const DEFAULT_EVENT_TITLES: Record<string, string> = {
  [CoreEvent.object_added]: 'Object added',
  [CoreEvent.object_removed]: 'Object removed',
  [CoreEvent.object_updated]: 'Object updated',
  [CoreEvent.folder_scanned]: 'Folder scanned',
  [CoreEvent.serverless_task_enqueued]: 'Task enqueued',
  [CoreEvent.docker_task_enqueued]: 'Task enqueued',
  [CoreEvent.new_user_registered]: 'New user registered',
}

export interface NotificationEventContext {
  /** The primary event (e.g. first in batch) */
  event: Event
  /** All events in the batch, when notification aggregates multiple events */
  events?: Event[]
}

export type NotificationTitleBuilder = (ctx: NotificationEventContext) => string

export type NotificationBodyBuilder = (
  ctx: NotificationEventContext,
) => string | null

/**
 * Custom title/body builders per event identifier (e.g. "object_added").
 * Extend this map to add custom title/body for new event types.
 * Builders receive the full event and optional events array (for batched notifications).
 */
const EVENT_CONTENT_BUILDERS: Partial<
  Record<
    string,
    { title?: NotificationTitleBuilder; body?: NotificationBodyBuilder }
  >
> = {
  [CoreEvent.object_added]: {
    title: (ctx) =>
      ctx.events && ctx.events.length > 1
        ? `${ctx.events.length} objects added`
        : 'Object added',
    body: (ctx) => {
      const key = ctx.event.targetLocationObjectKey
      return key != null && key.length > 0 ? key : null
    },
  },
  [CoreEvent.object_removed]: {
    title: (ctx) =>
      ctx.events && ctx.events.length > 1
        ? `${ctx.events.length} objects removed`
        : 'Object removed',
    body: (ctx) => {
      const key = ctx.event.targetLocationObjectKey
      return key != null && key.length > 0 ? key : null
    },
  },
  [CoreEvent.object_updated]: {
    title: (ctx) =>
      ctx.events && ctx.events.length > 1
        ? `${ctx.events.length} objects updated`
        : 'Object updated',
    body: (ctx) => {
      const key = ctx.event.targetLocationObjectKey
      return key != null && key.length > 0 ? key : null
    },
  },
  [CoreEvent.folder_scanned]: {
    title: () => 'Folder scanned',
  },
}

function getEventIdentifier(event: Event): string {
  return event.eventIdentifier
}

function defaultTitleFallback(eventIdentifier: string): string {
  const label = DEFAULT_EVENT_TITLES[eventIdentifier]
  if (label) {
    return label
  }
  return eventIdentifier
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Build notification title from event(s). Uses custom builder when defined for the event type,
 * otherwise falls back to default title from event identifier.
 */
export function buildNotificationTitle(event: Event, events?: Event[]): string {
  const ctx: NotificationEventContext = { event, events }
  const identifier = getEventIdentifier(event)
  const builder = EVENT_CONTENT_BUILDERS[identifier]
  if (builder?.title) {
    return builder.title(ctx)
  }
  return defaultTitleFallback(event.eventIdentifier)
}

/**
 * Build notification body from event(s). Returns null when no custom body is defined.
 */
export function buildNotificationBody(
  event: Event,
  events?: Event[],
): string | null {
  const ctx: NotificationEventContext = { event, events }
  const identifier = getEventIdentifier(event)
  const builder = EVENT_CONTENT_BUILDERS[identifier]
  if (builder?.body) {
    return builder.body(ctx)
  }
  return null
}

/**
 * Build internal navigation path from event location.
 */
export function buildNotificationPath(
  event: Event,
  events?: Event[],
): string | undefined {
  const folderId = event.targetLocationFolderId
  const objectKey = event.targetLocationObjectKey
  if (folderId) {
    if (objectKey != null && objectKey.length > 0 && !events) {
      return `/folders/${folderId}/objects/${encodeS3ObjectKey(objectKey)}`
    }
    return `/folders/${folderId}`
  }
}
