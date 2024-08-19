import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { foldersTable } from 'src/folders/entities/folder.entity'

import { eventsTable } from '../../event/entities/event.entity'

export const tasksTable = pgTable('tasks', {
  id: uuid('id').primaryKey(),
  ownerIdentifier: text('ownerIdentifier').notNull(), // CORE, APP:CORE, APP:OTHER, ...
  taskKey: text('taskKey').notNull(),
  taskDescription: jsonb('taskDescription')
    .$type<{
      textKey: string
      variables: { [key: string]: string }
    }>()
    .notNull(),
  inputData: jsonb('inputData')
    .notNull()
    .$type<{ [key: string]: string | number }>(),
  updates: jsonb('updates')
    .notNull()
    .$type<
      { updateData: { [key: string]: any }; updateTemplateString: string }[]
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
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type Task = typeof tasksTable.$inferSelect
export type NewTask = typeof tasksTable.$inferInsert
