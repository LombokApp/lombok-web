import { relations } from 'drizzle-orm'
import {
  index,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { usersTable } from 'src/users/entities/user.entity'

import { commentsTable } from './comment.entity'

export const commentMentionsTable = pgTable(
  'comment_mentions',
  {
    commentId: uuid('comment_id')
      .notNull()
      .references(() => commentsTable.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.commentId, table.userId] }),
    index('idx_mentions_user_lookup').on(table.userId, table.createdAt),
  ],
)

export const commentMentionsRelations = relations(
  commentMentionsTable,
  ({ one }) => ({
    comment: one(commentsTable, {
      fields: [commentMentionsTable.commentId],
      references: [commentsTable.id],
    }),
    user: one(usersTable, {
      fields: [commentMentionsTable.userId],
      references: [usersTable.id],
    }),
  }),
)

export type CommentMention = typeof commentMentionsTable.$inferSelect
export type NewCommentMention = typeof commentMentionsTable.$inferInsert
