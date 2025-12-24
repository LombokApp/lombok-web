import type {
  JsonSerializableObject,
  StorageAccessPolicy,
  SystemLogEntry,
  TargetLocationContext,
  TaskData,
  TaskInvocation,
  TaskLogEntry,
} from '@lombokapp/types'
import { sql } from 'drizzle-orm'
import {
  boolean,
  customType,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// Custom type to handle the nested dates (that will be serialized as ISO strings) in the log entries
export const logJsonb = <TLog extends { at: Date }>(name: string) =>
  customType<{ data: TLog[]; driverData: unknown }>({
    dataType() {
      return 'jsonb'
    },
    toDriver(value: TLog[]) {
      // Persist as ISO strings for `at`
      const raw = value.map((entry) => ({
        ...entry,
        at: entry.at.toISOString(),
      }))

      return JSON.stringify(raw)
    },
    fromDriver(value: unknown): TLog[] {
      // Depending on driver, this might already be parsed
      const rawArray = (
        typeof value === 'string' ? JSON.parse(value) : value
      ) as (TLog & { at: string })[]

      return rawArray.map((entry) => ({
        ...entry,
        at: new Date(entry.at),
      }))
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
    data: jsonb('data').notNull().$type<TaskData>(),
    trigger: jsonb('trigger').$type<TaskInvocation>().notNull(),
    targetUserId: uuid('targetUserId'),
    targetLocation: jsonb('targetLocation').$type<TargetLocationContext>(),
    startedAt: timestamp('startedAt'),
    dontStartBefore: timestamp('dontStartBefore'),
    completedAt: timestamp('completedAt'),
    systemLog: logJsonb<SystemLogEntry>('systemLog').notNull().default([]),
    taskLog: logJsonb<TaskLogEntry>('taskLog').notNull().default([]),
    storageAccessPolicy: jsonb('storageAccessPolicy')
      .$type<StorageAccessPolicy>()
      .notNull()
      .default([]),
    success: boolean('success'),
    userVisible: boolean('userVisible').default(true),
    error: jsonb('error').$type<{
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
    index('tasks_trigger_kind_idx').using(
      'btree',
      sql`(${table.trigger} ->> 'kind')`,
    ),
    index('tasks_target_location_folder_id_idx').using(
      'btree',
      sql`((${table.targetLocation} ->> 'folderId')::uuid)`,
    ),
  ],
)

export type Task = typeof tasksTable.$inferSelect
export type NewTask = typeof tasksTable.$inferInsert
