import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { usersTable } from 'src/users/entities/user.entity'

export const storageLocationsTable = pgTable('storage_locations', {
  id: uuid('id').primaryKey(),
  accessKeyHashId: text('accessKeyHashId').notNull(),
  providerType: text('providerType').notNull().$type<'SERVER' | 'USER'>(),
  label: text('label').notNull(),
  endpoint: text('endpoint').notNull(),
  endpointDomain: text('endpointDomain').notNull(),
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
