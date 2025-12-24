import { z } from 'zod'

import { PLATFORM_IDENTIFIER } from './platform.types'

export enum PlatformEvent {
  object_added = 'object_added',
  object_removed = 'object_removed',
  object_updated = 'object_updated',
  folder_scanned = 'folder_scanned',
  worker_task_enqueued = 'worker_task_enqueued',
  docker_task_enqueued = 'docker_task_enqueued',
}

export const eventIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z_]+$/)

export const platformPrefixedEventIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^platform:[a-z_]+$/)

export const PlatformObjectAddedEventTriggerIdentifier = `${PLATFORM_IDENTIFIER}:${PlatformEvent.object_added}`
export const PlatformObjectRemovedEventTriggerIdentifier = `${PLATFORM_IDENTIFIER}:${PlatformEvent.object_removed}`
export const PlatformObjectUpdatedEventTriggerIdentifier = `${PLATFORM_IDENTIFIER}:${PlatformEvent.object_updated}`
