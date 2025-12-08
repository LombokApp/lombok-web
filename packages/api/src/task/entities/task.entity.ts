import type {
  JsonSerializableObject,
  StorageAccessPolicy,
  SystemLogEntry,
  TargetLocationContext,
  TaskInputData,
  TaskLogEntry,
  TaskTrigger,
} from '@lombokapp/types'
import { sql } from 'drizzle-orm'
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// Recursive type for nested Records with string keys and string/number values
export const tasksTable = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey(),
    ownerIdentifier: text('ownerIdentifier').notNull(), // core, app:core, app:other, ...
    taskIdentifier: text('taskIdentifier').notNull(),
    taskDescription: text('taskDescription').notNull(),
    data: jsonb('data').notNull().$type<TaskInputData>(),
    trigger: jsonb('trigger').$type<TaskTrigger>().notNull(),
    targetUserId: uuid('targetUserId'),
    targetLocation: jsonb('targetLocation').$type<TargetLocationContext>(),
    taskLog: jsonb('taskLog').$type<TaskLogEntry[]>().notNull().default([]),
    startedAt: timestamp('startedAt'),
    dontStartBefore: timestamp('dontStartBefore'),
    completedAt: timestamp('completedAt'),
    systemLog: jsonb('systemLog')
      .$type<SystemLogEntry[]>()
      .notNull()
      .default([]),
    storageAccessPolicy: jsonb('storageAccessPolicy')
      .$type<StorageAccessPolicy>()
      .notNull()
      .default([]),
    success: boolean('success'),
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
    index('tasks_folder_idx').using(
      'btree',
      sql`(${table.targetLocation} ->> 'folderId')`,
    ),
  ],
)

export type Task = typeof tasksTable.$inferSelect
export type NewTask = typeof tasksTable.$inferInsert
