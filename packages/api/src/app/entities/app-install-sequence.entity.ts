import { integer, pgTable, text } from 'drizzle-orm/pg-core'

/**
 * Per-slug install counter. The next fresh install of `slug` consumes
 * `nextPosition` (then increments it) and derives its 8-char hex app id
 * from `(slug, position)`. Rows are kept across uninstalls so an id is
 * never reused — historical events/tasks referencing a long-uninstalled
 * app id can never collide with a freshly installed one.
 */
export const appInstallSequencesTable = pgTable('app_install_sequences', {
  slug: text('slug').primaryKey(),
  nextPosition: integer('next_position').notNull(),
})

export type AppInstallSequence = typeof appInstallSequencesTable.$inferSelect
export type NewAppInstallSequence = typeof appInstallSequencesTable.$inferInsert
