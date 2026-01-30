import { sql } from 'drizzle-orm'
import {
  boolean,
  index,
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
    isAdmin: boolean('is_admin').default(false).notNull(),
    name: text('name'),
    username: text('username').notNull(),
    email: text('email'),
    emailVerified: boolean('email_verified').notNull().default(false),
    permissions: jsonb('permissions').$type<string[]>().notNull().default([]),
    passwordHash: text('password_hash'),
    passwordSalt: text('password_salt'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    // Case-insensitive unique index on username
    uniqueIndex('users_username_unique_lower').on(
      sql`lower(${table.username})`,
    ),
    index('users_email_idx').on(table.email),
  ],
)

export type User = typeof usersTable.$inferSelect
export type NewUser = typeof usersTable.$inferInsert
