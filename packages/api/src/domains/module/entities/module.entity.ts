import type { ModuleConfig } from '@stellariscloud/types'
import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { bytea } from '../../../orm/constants'

export interface ModuleUIRootConfig {
  slug: string
  storageLocationId: string
  objectKey: string
}

export const modulesTable = pgTable('modules', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  enabled: boolean('enabled').notNull().default(false),
  publicKey: bytea('publicKey').notNull(),
  config: jsonb('config').$type<ModuleConfig>().notNull(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type Module = typeof modulesTable.$inferSelect
export type NewModule = typeof modulesTable.$inferInsert
