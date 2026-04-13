import { relations } from 'drizzle-orm'
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import type { z } from 'zod'

import type { dockerResourceConfigDataSchema } from '../dto/docker-resource-config-input.dto'
import { dockerHostsTable } from './docker-host.entity'
import { dockerProfileResourceAssignmentsTable } from './docker-profile-resource-assignment.entity'
import { dockerStandaloneContainersTable } from './docker-standalone-container.entity'

export type DockerResourceConfig = z.infer<
  typeof dockerResourceConfigDataSchema
>

export const dockerResourceConfigsTable = pgTable(
  'docker_resource_configs',
  {
    id: uuid('id').primaryKey(),
    dockerHostId: uuid('docker_host_id')
      .notNull()
      .references(() => dockerHostsTable.id),
    label: text('label').notNull(),
    config: jsonb('config').$type<DockerResourceConfig>().notNull().default({}),
    configHashes: jsonb('config_hashes')
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    index('docker_resource_configs_docker_host_id_idx').on(table.dockerHostId),
  ],
)

export const dockerResourceConfigsRelations = relations(
  dockerResourceConfigsTable,
  ({ one, many }) => ({
    dockerHost: one(dockerHostsTable, {
      fields: [dockerResourceConfigsTable.dockerHostId],
      references: [dockerHostsTable.id],
    }),
    profileAssignments: many(dockerProfileResourceAssignmentsTable),
    standaloneContainers: many(dockerStandaloneContainersTable),
  }),
)

export type DockerResourceConfigRow =
  typeof dockerResourceConfigsTable.$inferSelect
export type NewDockerResourceConfigRow =
  typeof dockerResourceConfigsTable.$inferInsert
