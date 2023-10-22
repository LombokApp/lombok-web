import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { PlatformRole } from '../../auth/constants/role.constants'

export const roleEnum = pgEnum('role', [PlatformRole.Admin, PlatformRole.User])

export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey(),
  role: roleEnum('role').notNull(),
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
