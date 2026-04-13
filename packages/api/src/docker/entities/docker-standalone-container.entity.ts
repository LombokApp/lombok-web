import { relations } from 'drizzle-orm'
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { dockerResourceConfigsTable } from './docker-resource-config.entity'

export const dockerStandaloneContainersTable = pgTable(
  'docker_standalone_containers',
  {
    id: uuid('id').primaryKey(),
    dockerResourceConfigId: uuid('docker_resource_config_id')
      .notNull()
      .references(() => dockerResourceConfigsTable.id),
    label: text('label').notNull(),
    image: text('image').notNull(),
    tag: text('tag').notNull().default('latest'),
    desiredStatus: text('desired_status')
      .notNull()
      .$type<'running' | 'stopped'>()
      .default('stopped'),
    containerId: text('container_id'),
    ports: jsonb('ports')
      .$type<{ host: number; container: number; protocol: 'tcp' | 'udp' }[]>()
      .notNull()
      .default([]),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    index('docker_standalone_containers_config_id_idx').on(
      table.dockerResourceConfigId,
    ),
    index('docker_standalone_containers_desired_status_idx').on(
      table.desiredStatus,
    ),
  ],
)

export const dockerStandaloneContainersRelations = relations(
  dockerStandaloneContainersTable,
  ({ one }) => ({
    resourceConfig: one(dockerResourceConfigsTable, {
      fields: [dockerStandaloneContainersTable.dockerResourceConfigId],
      references: [dockerResourceConfigsTable.id],
    }),
  }),
)

export type DockerStandaloneContainer =
  typeof dockerStandaloneContainersTable.$inferSelect
export type NewDockerStandaloneContainer =
  typeof dockerStandaloneContainersTable.$inferInsert
