import { relations, sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { folderObjectsTable } from 'src/folders/entities/folder-object.entity'
import { usersTable } from 'src/users/entities/user.entity'

export const commentsTable = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    folderId: uuid('folder_id')
      .notNull()
      .references(() => foldersTable.id, { onDelete: 'cascade' }),
    folderObjectId: uuid('folder_object_id')
      .notNull()
      .references(() => folderObjectsTable.id, { onDelete: 'cascade' }),
    rootId: uuid('root_id'),
    quoteId: uuid('quote_id'),
    authorId: uuid('author_id')
      .notNull()
      .references(() => usersTable.id),
    content: text('content').notNull(),
    anchor: jsonb('anchor').$type<CommentAnchor | null>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    check('content_not_empty', sql`length(content) > 0`),
    check(
      'anchor_only_on_root',
      sql`
      (root_id IS NOT NULL AND anchor IS NULL) OR
      root_id IS NULL
    `,
    ),
    check('no_self_quote', sql`quote_id != id`),
    foreignKey({
      columns: [table.rootId],
      foreignColumns: [table.id],
      name: 'comments_root_id_comments_id_fk',
    })
      .onDelete('cascade')
      .onUpdate('no action'),
    foreignKey({
      columns: [table.quoteId],
      foreignColumns: [table.id],
      name: 'comments_quote_id_comments_id_fk',
    })
      .onDelete('restrict')
      .onUpdate('no action'),
    index('idx_comments_folder_object_roots')
      .on(table.folderObjectId, table.createdAt)
      .where(sql`root_id IS NULL AND deleted_at IS NULL`),
    index('idx_comments_thread_flat')
      .on(table.rootId, table.createdAt)
      .where(sql`root_id IS NOT NULL AND deleted_at IS NULL`),
    index('idx_comments_tombstone_lookup').on(
      table.id,
      table.deletedAt,
      table.authorId,
    ),
  ],
)

export const commentsRelations = relations(commentsTable, ({ one, many }) => ({
  folder: one(foldersTable, {
    fields: [commentsTable.folderId],
    references: [foldersTable.id],
  }),
  folderObject: one(folderObjectsTable, {
    fields: [commentsTable.folderObjectId],
    references: [folderObjectsTable.id],
  }),
  author: one(usersTable, {
    fields: [commentsTable.authorId],
    references: [usersTable.id],
  }),
  root: one(commentsTable, {
    fields: [commentsTable.rootId],
    references: [commentsTable.id],
    relationName: 'root',
  }),
  replies: many(commentsTable, {
    relationName: 'root',
  }),
  quotedComment: one(commentsTable, {
    fields: [commentsTable.quoteId],
    references: [commentsTable.id],
    relationName: 'quoted',
  }),
  // Mentions and reactions relations will be defined in their respective entity files
}))

export type CommentAnchor =
  | { type: 'image_point'; x: number; y: number }
  | { type: 'video_point'; t: number; x?: number; y?: number }
  | { type: 'audio_point'; t: number }

export type Comment = typeof commentsTable.$inferSelect
export type NewComment = typeof commentsTable.$inferInsert

export interface CommentAuthor {
  id: string
  username: string
  name: string | null
  email: string | null
}
