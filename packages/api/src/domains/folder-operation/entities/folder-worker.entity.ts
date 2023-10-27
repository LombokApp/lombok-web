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
  ipAddress: text('ipAddress').notNull(),
  capabilities: text('capabilities').array().$type<string[]>(),
  ips: jsonb('ips')
    .$type<{
      [key: string]: { firstSeen: Date; lastSeen: Date }
    }>()
    .notNull(),
  firstSeen: timestamp('firstSeen'),
  lastSeen: timestamp('lastSeen'),
  keyId: uuid('keyId').references(() => folderWorkerKeysTable.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type FolderWorker = typeof folderWorkersTable.$inferSelect
export type NewFolderWorker = typeof folderWorkersTable.$inferInsert
