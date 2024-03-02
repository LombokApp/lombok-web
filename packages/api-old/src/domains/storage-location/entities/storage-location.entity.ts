import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { usersTable } from '../../user/entities/user.entity'

export const providerTypeEnum = pgEnum('providerType', ['SERVER', 'USER'])

export const storageLocationsTable = pgTable('storage_locations', {
  id: uuid('id').primaryKey(),
  providerType: providerTypeEnum('providerType').notNull(),
  name: text('name').notNull(),
  endpoint: text('endpoint').notNull(),
  region: text('region').notNull(),
  accessKeyId: text('accessKeyId').notNull(),
  secretAccessKey: text('secretAccessKey').notNull(),
  bucket: text('bucket').notNull(),
  prefix: text('prefix').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type StorageLocation = typeof storageLocationsTable.$inferSelect
export type NewStorageLocation = typeof storageLocationsTable.$inferInsert
