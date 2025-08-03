export enum FolderPushMessage {
  OBJECTS_ADDED = 'OBJECTS_ADDED',
  OBJECTS_REMOVED = 'OBJECTS_REMOVED',
  OBJECTS_UPDATED = 'OBJECTS_UPDATED',
  OBJECT_ADDED = 'OBJECT_ADDED',
  OBJECT_REMOVED = 'OBJECT_REMOVED',
  OBJECT_UPDATED = 'OBJECT_UPDATED',
  TASK_ADDED = 'TASK_ADDED',
  TASK_UPDATED = 'TASK_UPDATED',
  EVENT_CREATED = 'EVENT_CREATED',
}

export enum UserPushMessage {
  FOLDER_CREATED = 'FOLDER_CREATED',
  FOLDER_DELETED = 'FOLDER_DELETED',
}

export enum ServerPushMessage {
  APPS_UPDATED = 'APPS_UPDATED',
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
}

export type AppPushMessage = ServerPushMessage | FolderPushMessage

export interface AppLogEntry {
  level: 'error' | 'warning' | 'info' | 'debug'
  name: string
  message: string
  data: Record<string, unknown>
}
