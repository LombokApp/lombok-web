import type {
  JsonSerializableObject,
  StorageAccessPolicy,
  SystemLogEntry,
  TaskInputData,
  TaskLogEntry,
} from '@lombokapp/types'
import { relations } from 'drizzle-orm'
import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { foldersTable } from 'src/folders/entities/folder.entity'

import { eventsTable } from '../../event/entities/event.entity'

// Recursive type for nested Records with string keys and string/number values
export const tasksTable = pgTable('tasks', {
  id: uuid('id').primaryKey(),
  ownerIdentifier: text('ownerIdentifier').notNull(), // core, app:core, app:other, ...
  taskIdentifier: text('taskIdentifier').notNull(),
  taskDescription: text('taskDescription').notNull(),
  inputData: jsonb('inputData').notNull().$type<TaskInputData>(),
  eventId: uuid('eventId')
    .references(() => eventsTable.id)
    .notNull(),
  subjectFolderId: uuid('subjectFolderId').references(() => foldersTable.id),
  subjectObjectKey: text('subjectObjectKey'),
  taskLog: jsonb('taskLog').$type<TaskLogEntry[]>().notNull().default([]),
  startedAt: timestamp('startedAt'),
  dontStartBefore: timestamp('dontStartBefore'),
  completedAt: timestamp('completedAt'),
  systemLog: jsonb('systemLog').$type<SystemLogEntry[]>().notNull().default([]),
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
})

export const tasksRelations = relations(tasksTable, ({ one }) => ({
  folder: one(foldersTable, {
    fields: [tasksTable.subjectFolderId],
    references: [foldersTable.id],
  }),
}))

export type Task = typeof tasksTable.$inferSelect
export type NewTask = typeof tasksTable.$inferInsert
