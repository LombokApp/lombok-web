import type { TaskInputData, WorkerErrorDetails } from '@lombokapp/types'
import { relations } from 'drizzle-orm'
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { foldersTable } from 'src/folders/entities/folder.entity'

import { eventsTable } from '../../event/entities/event.entity'

// Recursive type for nested Records with string keys and string/number values
export const tasksTable = pgTable('tasks', {
  id: uuid('id').primaryKey(),
  ownerIdentifier: text('ownerIdentifier').notNull(), // core, app:core, app:other, ...
  taskIdentifier: text('taskIdentifier').notNull(),
  taskDescription: text('taskDescription').notNull(),
  inputData: jsonb('inputData').notNull().$type<TaskInputData>(),
  updates: jsonb('updates')
    .notNull()
    .$type<
      { updateData: Record<string, unknown>; updateTemplateString: string }[]
    >()
    .default([]),
  triggeringEventId: uuid('triggeringEventId')
    .references(() => eventsTable.id)
    .notNull(),
  subjectFolderId: uuid('subjectFolderId').references(() => foldersTable.id),
  subjectObjectKey: text('subjectObjectKey'),
  startedAt: timestamp('startedAt'),
  completedAt: timestamp('completedAt'),
  errorAt: timestamp('errorAt'),
  errorCode: text('errorCode'),
  errorMessage: text('errorMessage'),
  errorDetails: jsonb('errorDetails').$type<WorkerErrorDetails>(),
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
