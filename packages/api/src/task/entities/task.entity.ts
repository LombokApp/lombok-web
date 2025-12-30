import type {
  JsonSerializableObject,
  StorageAccessPolicy,
  SystemLogEntry,
  TaskData,
  TaskInvocation,
  TaskLogEntry,
} from '@lombokapp/types'
import { sql } from 'drizzle-orm'
import {
  boolean,
  customType,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { jsonbBase64 } from 'src/orm/util/json-base64-type'

import {
  deserializeLogEntry,
  serializeLogEntry,
} from '../util/log-encoder.util'

// Custom type to handle serializing of the date objects and untrusted json payloads data in the log entries
export const logJsonb = <
  TLog extends {
    at: Date
    message: string
    logType: string
    payload?: JsonSerializableObject | undefined
  },
>(
  name: string,
) =>
  customType<{ data: TLog[]; driverData: unknown }>({
    dataType() {
      return 'jsonb'
    },
    toDriver(value: TLog[]) {
      // Persist as ISO strings for `at`
      const raw = value.map(serializeLogEntry)

      const rawString = JSON.stringify(raw)
      return rawString
    },
    fromDriver(value: unknown): TLog[] {
      // Depending on driver, this might already be parsed
      const rawArray = (
        typeof value === 'string' ? JSON.parse(value) : value
      ) as (TLog & { at: string; payload?: string })[]
      return rawArray.map(deserializeLogEntry) as TLog[]
    },
  })(name)

// Recursive type for nested Records with string keys and string/number values
export const tasksTable = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey(),
    ownerIdentifier: text('ownerIdentifier').notNull(), // core, app:core, app:other, ...
    taskIdentifier: text('taskIdentifier').notNull(),
    taskDescription: text('taskDescription').notNull(),
    data: jsonbBase64('data').notNull().$type<TaskData>(),
    trigger: jsonbBase64('trigger').$type<TaskInvocation>().notNull(),
    targetUserId: uuid('targetUserId'),
    targetLocationFolderId: uuid('targetLocationFolderId'),
    targetLocationObjectKey: text('targetLocationObjectKey'),
    startedAt: timestamp('startedAt'),
    dontStartBefore: timestamp('dontStartBefore'),
    completedAt: timestamp('completedAt'),
    systemLog: logJsonb<SystemLogEntry>('systemLog').notNull().default([]),
    taskLog: logJsonb<TaskLogEntry>('taskLog').notNull().default([]),
    storageAccessPolicy: jsonbBase64('storageAccessPolicy')
      .$type<StorageAccessPolicy>()
      .notNull(),
    success: boolean('success'),
    userVisible: boolean('userVisible').default(true),
    error: jsonbBase64('error').$type<{
      code: string
      message: string
      details?: JsonSerializableObject
    }>(),
    createdAt: timestamp('createdAt').notNull(),
    updatedAt: timestamp('updatedAt').notNull(),
    handlerType: text('handlerType').notNull(),
    handlerIdentifier: text('handlerIdentifier'),
  },
  (table) => [
    index('tasks_trigger_kind_idx').on(sql`(${table.trigger} ->> 'kind')`),
    index('tasks_target_location_folder_id_idx').on(
      table.targetLocationFolderId,
    ),
    index('tasks_target_location_folder_id_object_key_idx').on(
      table.targetLocationFolderId,
      table.targetLocationObjectKey,
    ),
  ],
)

export type Task = typeof tasksTable.$inferSelect
export type NewTask = typeof tasksTable.$inferInsert
export type TaskSummary = Omit<Task, 'data' | 'systemLog' | 'taskLog'>
