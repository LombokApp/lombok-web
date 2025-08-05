import type { TaskInputData, WorkerErrorDetails } from '@stellariscloud/types'
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
    .notNull()
    .references(() => eventsTable.id),
  handlerId: text('handlerId'),
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
  workerIdentifier: text('workerIdentifier'),
})

export type Task = typeof tasksTable.$inferSelect
export type NewTask = typeof tasksTable.$inferInsert
