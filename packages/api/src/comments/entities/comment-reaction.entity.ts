import { relations } from 'drizzle-orm'
import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { usersTable } from 'src/users/entities/user.entity'

import { commentsTable } from './comment.entity'

export const commentReactionsTable = pgTable(
  'comment_reactions',
  {
    commentId: uuid('comment_id')
      .notNull()
      .references(() => commentsTable.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    emoji: text('emoji').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.commentId, table.userId, table.emoji] }),
    index('idx_reactions_comment_lookup').on(table.commentId, table.createdAt),
  ],
)

export const commentReactionsRelations = relations(
  commentReactionsTable,
  ({ one }) => ({
    comment: one(commentsTable, {
      fields: [commentReactionsTable.commentId],
      references: [commentsTable.id],
    }),
    user: one(usersTable, {
      fields: [commentReactionsTable.userId],
      references: [usersTable.id],
    }),
  }),
)

export type CommentReaction = typeof commentReactionsTable.$inferSelect
export type NewCommentReaction = typeof commentReactionsTable.$inferInsert
