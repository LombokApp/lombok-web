import { z } from 'zod'

import { CORE_IDENTIFIER } from './platform.types'

export enum PlatformEvent {
  object_added = 'object_added',
  object_removed = 'object_removed',
  object_updated = 'object_updated',
  folder_scanned = 'folder_scanned',
  serverless_task_enqueued = 'serverless_task_enqueued',
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

export const PlatformObjectAddedEventTriggerIdentifier = `${CORE_IDENTIFIER}:${PlatformEvent.object_added}`
export const PlatformObjectRemovedEventTriggerIdentifier = `${CORE_IDENTIFIER}:${PlatformEvent.object_removed}`
export const PlatformObjectUpdatedEventTriggerIdentifier = `${CORE_IDENTIFIER}:${PlatformEvent.object_updated}`
