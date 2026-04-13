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

export type DockerResourceConfig = z.infer<
  typeof dockerResourceConfigDataSchema
>

export const dockerStandaloneContainersTable = pgTable(
  'docker_standalone_containers',
  {
    id: uuid('id').primaryKey(),
    dockerHostId: uuid('docker_host_id')
      .notNull()
      .references(() => dockerHostsTable.id),
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
    config: jsonb('config').$type<DockerResourceConfig>().notNull().default({}),
    configHashes: jsonb('config_hashes')
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    index('docker_standalone_containers_desired_status_idx').on(
      table.desiredStatus,
    ),
    index('docker_standalone_containers_docker_host_id_idx').on(
      table.dockerHostId,
    ),
  ],
)

export const dockerStandaloneContainersRelations = relations(
  dockerStandaloneContainersTable,
  ({ one }) => ({
    dockerHost: one(dockerHostsTable, {
      fields: [dockerStandaloneContainersTable.dockerHostId],
      references: [dockerHostsTable.id],
    }),
  }),
)

export type DockerStandaloneContainer =
  typeof dockerStandaloneContainersTable.$inferSelect
export type NewDockerStandaloneContainer =
  typeof dockerStandaloneContainersTable.$inferInsert
