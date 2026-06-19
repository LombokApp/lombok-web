import type { z } from 'zod'

import type { NotificationDTO } from './api.types'
import type { folderObjectSchema } from './content.types'
import type { JsonSerializableObject } from './json.types'

/** Matches what the API's transformFolderObjectToDTO emits (same source schema). */
type FolderObjectData = z.infer<typeof folderObjectSchema>

/** Single wire-level Socket.IO event name every realtime envelope is emitted under. */
export const REALTIME_EVENT = 'event'

/** Where an event was authorized to go. Client uses it for routing only — never trust. */
export type RealtimeScope =
  | { kind: 'user'; userId: string }
  | { kind: 'folder'; folderId: string }
  | { kind: 'server' } // admin-only

/** Closed, typed union of every platform realtime event. `data` stays loose so payloads can evolve. */
export type RealtimeEvent =
  // folder-scoped
  | {
      resource: 'folder.object'
      action: 'created' | 'updated' | 'removed'
      id: string
      data: { folderObject: FolderObjectData }
    }
  | {
      resource: 'folder.task'
      action: 'created' | 'updated'
      id: string
      data: JsonSerializableObject
    }
  | {
      resource: 'folder.event'
      action: 'created'
      id: string
      data: JsonSerializableObject
    }
  | {
      resource: 'folder.comment'
      action: 'created' | 'updated' | 'removed' | 'reacted'
      id: string
      data: JsonSerializableObject
    }
  // user-scoped
  | {
      resource: 'user.notification'
      action: 'delivered'
      id: string
      data: { notification: NotificationDTO }
    }
  | {
      resource: 'user.folder'
      action: 'created' | 'removed' | 'starred' | 'unstarred'
      id: string
      data: JsonSerializableObject
    }
  | {
      resource: 'user.apps'
      action: 'changed'
      data: JsonSerializableObject
    }
  // server-scoped (admin only)
  | {
      resource: 'server.settings'
      action: 'updated'
      data: JsonSerializableObject
    }
  | {
      resource: 'server.app'
      action: 'installed' | 'enabled' | 'disabled' | 'updated' | 'uninstalled'
      id: string
      data: JsonSerializableObject
    }
  | {
      resource: 'server.user'
      action: 'created' | 'updated' | 'deleted'
      id: string
      data: JsonSerializableObject
    }
  | {
      resource: 'server.session'
      action: 'created' | 'revoked'
      id: string
      data: JsonSerializableObject
    }
  | {
      resource: 'server.task'
      action: 'created' | 'updated'
      id: string
      data: JsonSerializableObject
    }
  | {
      resource: 'server.event'
      action: 'created'
      id: string
      data: JsonSerializableObject
    }
  | {
      resource: 'server.log'
      action: 'created'
      id: string
      data: JsonSerializableObject
    }
  | {
      resource:
        | 'server.docker.host'
        | 'server.docker.container'
        | 'server.docker.job'
      action: 'created' | 'updated' | 'removed'
      id: string
      data: JsonSerializableObject
    }

/** Full envelope on the wire. `ts` is stamped on the Node clock; `v` is the envelope version. */
export interface RealtimeEnvelope {
  scope: RealtimeScope
  event: RealtimeEvent
  ts: string
  v: 1
}

export type RealtimeResource = RealtimeEvent['resource']
