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
  email: text('email').unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  permissions: jsonb('permissions').$type<string[]>().notNull().default([]),
  passwordHash: text('passwordHash').notNull(),
  passwordSalt: text('passwordSalt').notNull(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type User = typeof usersTable.$inferSelect
export type NewUser = typeof usersTable.$inferInsert
