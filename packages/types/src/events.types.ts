import { z } from 'zod'

import { CORE_IDENTIFIER } from './core.types'

export enum CoreEvent {
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

export const corePrefixedEventIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^core:[a-z_]+$/)

export const CoreObjectAddedEventTriggerIdentifier = `${CORE_IDENTIFIER}:${CoreEvent.object_added}`
export const CoreObjectRemovedEventTriggerIdentifier = `${CORE_IDENTIFIER}:${CoreEvent.object_removed}`
export const CoreObjectUpdatedEventTriggerIdentifier = `${CORE_IDENTIFIER}:${CoreEvent.object_updated}`
