import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const demoEntitiesTable = pgTable('demo_entities', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type Demo = typeof demoEntitiesTable.$inferSelect
export type NewDemo = typeof demoEntitiesTable.$inferInsert
