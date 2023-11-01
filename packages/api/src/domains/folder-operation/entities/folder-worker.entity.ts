import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { folderWorkerKeysTable } from './folder-worker-key.entity'

export const folderWorkersTable = pgTable('folder_workers', {
  id: uuid('id').primaryKey(),
  externalId: text('externalId').notNull(),
  paused: boolean('paused').notNull().default(false),
  capabilities: text('capabilities').array().$type<string[]>().notNull(),
  ips: jsonb('ips')
    .$type<{
      [key: string]: { firstSeen: Date; lastSeen: Date } | undefined
    }>()
    .notNull(),
  firstSeen: timestamp('firstSeen').notNull(),
  lastSeen: timestamp('lastSeen').notNull(),
  keyId: uuid('keyId').references(() => folderWorkerKeysTable.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type FolderWorker = typeof folderWorkersTable.$inferSelect
export type NewFolderWorker = typeof folderWorkersTable.$inferInsert
