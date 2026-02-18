import { relations } from 'drizzle-orm'
import {
  boolean,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { usersTable } from 'src/users/entities/user.entity'

export const mcpUserSettingsTable = pgTable(
  'mcp_user_settings',
  {
    userId: uuid('user_id')
      .references(() => usersTable.id)
      .notNull(),
    canRead: boolean('can_read'),
    canWrite: boolean('can_write'),
    canDelete: boolean('can_delete'),
    canMove: boolean('can_move'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('mcp_user_settings_user_id_unique').on(table.userId),
  ],
)

export const mcpUserSettingsRelations = relations(
  mcpUserSettingsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [mcpUserSettingsTable.userId],
      references: [usersTable.id],
    }),
  }),
)

export type McpUserSettings = typeof mcpUserSettingsTable.$inferSelect
export type NewMcpUserSettings = typeof mcpUserSettingsTable.$inferInsert
