import { relations } from 'drizzle-orm'
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { appsTable } from 'src/app/entities/app.entity'

import { dockerResourceConfigsTable } from './docker-resource-config.entity'

export const dockerProfileResourceAssignmentsTable = pgTable(
  'docker_profile_resource_assignments',
  {
    id: uuid('id').primaryKey(),
    dockerResourceConfigId: uuid('docker_resource_config_id')
      .notNull()
      .references(() => dockerResourceConfigsTable.id),
    appIdentifier: text('app_identifier')
      .notNull()
      .references(() => appsTable.identifier),
    profileKey: text('profile_key').notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('docker_profile_resource_assignments_app_profile_unique').on(
      table.appIdentifier,
      table.profileKey,
    ),
    index('docker_profile_resource_assignments_config_id_idx').on(
      table.dockerResourceConfigId,
    ),
    index('docker_profile_resource_assignments_app_identifier_idx').on(
      table.appIdentifier,
    ),
  ],
)

export const dockerProfileResourceAssignmentsRelations = relations(
  dockerProfileResourceAssignmentsTable,
  ({ one }) => ({
    resourceConfig: one(dockerResourceConfigsTable, {
      fields: [dockerProfileResourceAssignmentsTable.dockerResourceConfigId],
      references: [dockerResourceConfigsTable.id],
    }),
    app: one(appsTable, {
      fields: [dockerProfileResourceAssignmentsTable.appIdentifier],
      references: [appsTable.identifier],
    }),
  }),
)

export type DockerProfileResourceAssignment =
  typeof dockerProfileResourceAssignmentsTable.$inferSelect
export type NewDockerProfileResourceAssignment =
  typeof dockerProfileResourceAssignmentsTable.$inferInsert
