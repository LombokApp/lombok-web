import { relations } from 'drizzle-orm'
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { appsTable } from 'src/app/entities/app.entity'
import type { z } from 'zod'

import type { dockerResourceConfigDataSchema } from '../dto/docker-resource-config-input.dto'
import { dockerHostsTable } from './docker-host.entity'

export type DockerResourceConfig = z.infer<
  typeof dockerResourceConfigDataSchema
>

export const dockerProfileResourceAssignmentsTable = pgTable(
  'docker_profile_resource_assignments',
  {
    id: uuid('id').primaryKey(),
    appIdentifier: text('app_identifier')
      .notNull()
      .references(() => appsTable.identifier),
    profileKey: text('profile_key').notNull(),
    dockerHostId: uuid('docker_host_id')
      .notNull()
      .references(() => dockerHostsTable.id),
    config: jsonb('config').$type<DockerResourceConfig>().notNull().default({}),
    configHashes: jsonb('config_hashes')
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('docker_profile_resource_assignments_app_profile_unique').on(
      table.appIdentifier,
      table.profileKey,
    ),
    index('docker_profile_resource_assignments_app_identifier_idx').on(
      table.appIdentifier,
    ),
    index('docker_profile_resource_assignments_docker_host_id_idx').on(
      table.dockerHostId,
    ),
  ],
)

export const dockerProfileResourceAssignmentsRelations = relations(
  dockerProfileResourceAssignmentsTable,
  ({ one }) => ({
    app: one(appsTable, {
      fields: [dockerProfileResourceAssignmentsTable.appIdentifier],
      references: [appsTable.identifier],
    }),
    dockerHost: one(dockerHostsTable, {
      fields: [dockerProfileResourceAssignmentsTable.dockerHostId],
      references: [dockerHostsTable.id],
    }),
  }),
)

export type DockerProfileResourceAssignment =
  typeof dockerProfileResourceAssignmentsTable.$inferSelect
export type NewDockerProfileResourceAssignment =
  typeof dockerProfileResourceAssignmentsTable.$inferInsert
