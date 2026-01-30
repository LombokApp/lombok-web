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
  integer,
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
    ownerIdentifier: text('owner_identifier').notNull(), // core, app:core, app:other, ...
    taskIdentifier: text('task_identifier').notNull(),
    taskDescription: text('task_description').notNull(),
    data: jsonbBase64('data').notNull().$type<TaskData>(),
    invocation: jsonbBase64('invocation').$type<TaskInvocation>().notNull(),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    targetUserId: uuid('target_user_id'),
    targetLocationFolderId: uuid('target_location_folder_id'),
    targetLocationObjectKey: text('target_location_object_key'),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    attemptCount: integer('attempt_count').notNull().default(0),
    failureCount: integer('failure_count').notNull().default(0),
    dontStartBefore: timestamp('dont_start_before'),
    systemLog: logJsonb<SystemLogEntry>('system_log').notNull().default([]),
    taskLog: logJsonb<TaskLogEntry>('task_log').notNull().default([]),
    storageAccessPolicy: jsonbBase64(
      'storage_access_policy',
    ).$type<StorageAccessPolicy>(),
    success: boolean('success'),
    userVisible: boolean('user_visible').default(true),
    error: jsonbBase64('error').$type<{
      code: string
      name: string
      message: string
      details?: JsonSerializableObject
    }>(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    latestHeartbeatAt: timestamp('latest_heartbeat_at'),
    handlerType: text('handler_type').notNull(),
    handlerIdentifier: text('handler_identifier'),
  },
  (table) => [
    index('tasks_trigger_kind_idx').on(sql`(${table.invocation} ->> 'kind')`),
    index('tasks_idempotency_key_idx').on(
      table.ownerIdentifier,
      table.taskIdentifier,
      table.idempotencyKey,
    ),
    index('tasks_target_location_folder_id_idx').on(
      table.targetLocationFolderId,
    ),
    index('tasks_target_location_folder_id_object_key_idx').on(
      table.targetLocationFolderId,
      table.targetLocationObjectKey,
    ),
    index('tasks_pending_core_idx')
      .on(table.ownerIdentifier, table.startedAt)
      .where(sql`${table.startedAt} IS NULL`),
    index('tasks_created_at_idx').on(table.createdAt),
    index('tasks_completed_at_success_idx').on(
      table.completedAt,
      table.success,
    ),
    index('tasks_target_user_id_idx').on(table.targetUserId),
  ],
)

export type NewTask = typeof tasksTable.$inferInsert
export type Task<T extends TaskData = TaskData> =
  typeof tasksTable.$inferSelect & {
    data: T
  }
export type TaskSummary = Omit<Task, 'data' | 'systemLog' | 'taskLog'>
