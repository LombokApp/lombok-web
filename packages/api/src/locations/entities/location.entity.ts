import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { usersTable } from 'src/users/entities/user.entity'

export const providerTypeEnum = pgEnum('providerType', ['SERVER', 'USER'])

export const locationsTable = pgTable('locations', {
  id: uuid('id').primaryKey(),
  providerType: providerTypeEnum('providerType').notNull(),
  label: text('label').notNull(),
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

export type Location = typeof locationsTable.$inferSelect
export type NewLocation = typeof locationsTable.$inferInsert
