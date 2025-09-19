import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey(),
  isAdmin: boolean('isAdmin').default(false).notNull(),
  name: text('name'),
  username: text('username').notNull().unique(),
  email: text('email'),
  emailVerified: boolean('emailVerified').notNull().default(false),
  permissions: jsonb('permissions').$type<string[]>().notNull().default([]),
  passwordHash: text('passwordHash'),
  passwordSalt: text('passwordSalt'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type User = typeof usersTable.$inferSelect
export type NewUser = typeof usersTable.$inferInsert
