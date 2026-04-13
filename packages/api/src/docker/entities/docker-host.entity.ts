import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { dockerResourceConfigsTable } from './docker-resource-config.entity'

export const dockerHostsTable = pgTable(
  'docker_hosts',
  {
    id: uuid('id').primaryKey(),
    label: text('label').notNull(),
    type: text('type').notNull().$type<'docker_endpoint'>(),
    host: text('host').notNull(),
    tlsConfig: jsonb('tls_config').$type<{
      ca?: string
      cert?: string
      key?: string
    }>(),
    isDefault: boolean('is_default').notNull().default(false),
    enabled: boolean('enabled').notNull().default(true),
    healthStatus: text('health_status')
      .notNull()
      .$type<'healthy' | 'unhealthy' | 'unknown'>()
      .default('unknown'),
    lastHealthCheck: timestamp('last_health_check'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    index('docker_hosts_is_default_idx').on(table.isDefault),
    index('docker_hosts_enabled_idx').on(table.enabled),
  ],
)

export const dockerHostsRelations = relations(dockerHostsTable, ({ many }) => ({
  resourceConfigs: many(dockerResourceConfigsTable),
}))

export type DockerHost = typeof dockerHostsTable.$inferSelect
export type NewDockerHost = typeof dockerHostsTable.$inferInsert
