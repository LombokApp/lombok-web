import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export interface ModuleUIRootConfig {
  slug: string
  storageLocationId: string
  objectKey: string
}

export interface ModuleConfig {
  requestedScopes: string[]
  identityPublicKey: string
  uiRoots: ModuleUIRootConfig[]
}

export const modulesTable = pgTable('modules', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  config: jsonb('config').$type<ModuleConfig>().notNull(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type Module = typeof modulesTable.$inferSelect
export type NewModule = typeof modulesTable.$inferInsert
