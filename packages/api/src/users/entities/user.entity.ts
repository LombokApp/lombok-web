import { sql } from 'drizzle-orm'
import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const usersTable = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    isAdmin: boolean('isAdmin').default(false).notNull(),
    name: text('name'),
    username: text('username').notNull(),
    email: text('email'),
    emailVerified: boolean('emailVerified').notNull().default(false),
    permissions: jsonb('permissions').$type<string[]>().notNull().default([]),
    passwordHash: text('passwordHash'),
    passwordSalt: text('passwordSalt'),
    createdAt: timestamp('createdAt').notNull(),
    updatedAt: timestamp('updatedAt').notNull(),
  },
  (table) => [
    // Case-insensitive unique index on username
    uniqueIndex('users_username_unique_lower').on(
      sql`lower(${table.username})`,
    ),
  ],
)

export type User = typeof usersTable.$inferSelect
export type NewUser = typeof usersTable.$inferInsert
