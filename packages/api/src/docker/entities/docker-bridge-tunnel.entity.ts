import { relations } from 'drizzle-orm'
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

import { appsTable } from '../../app/entities/app.entity'
import { usersTable } from '../../users/entities/user.entity'
import { dockerHostsTable } from './docker-host.entity'

/** Lifecycle of the desired-state row vs. its live bridge session. */
export type DockerBridgeTunnelStatus =
  | 'pending'
  | 'live'
  | 'unavailable'
  | 'error'

/** Durable tunnel desired state (DB is source of truth); `sessionId` is the only ephemeral field, recreated by the reconciler under the stable `publicId`. */
export const dockerBridgeTunnelsTable = pgTable(
  'docker_bridge_tunnels',
  {
    id: uuid('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => appsTable.identifier, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    hostId: uuid('host_id')
      .notNull()
      .references(() => dockerHostsTable.id),
    // App-chosen stable key for cheap per-scope listing (e.g. a workspace id).
    selectorKey: text('selector_key').notNull(),
    // Snapshot of identifying labels used to re-resolve the live container id.
    containerSelector: jsonb('container_selector')
      .$type<Record<string, string>>()
      .notNull(),
    port: integer('port').notNull(),
    label: text('label').notNull(),
    // Stable public id → stable public URL across session recreation.
    publicId: text('public_id').notNull().unique(),
    // Agent spawn command, replayed verbatim on recreation.
    command: jsonb('command').$type<string[]>().notNull(),
    // Live bridge session id — the only ephemeral field (null when down).
    sessionId: text('session_id'),
    status: text('status')
      .notNull()
      .$type<DockerBridgeTunnelStatus>()
      .default('pending'),
    lastError: text('last_error'),
    lastBoundAt: timestamp('last_bound_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    unique('docker_bridge_tunnels_scope_port_uq').on(
      table.appId,
      table.userId,
      table.selectorKey,
      table.port,
    ),
    index('docker_bridge_tunnels_app_id_idx').on(table.appId),
    index('docker_bridge_tunnels_host_id_idx').on(table.hostId),
    index('docker_bridge_tunnels_status_idx').on(table.status),
  ],
)

export const dockerBridgeTunnelsRelations = relations(
  dockerBridgeTunnelsTable,
  ({ one }) => ({
    app: one(appsTable, {
      fields: [dockerBridgeTunnelsTable.appId],
      references: [appsTable.identifier],
    }),
    user: one(usersTable, {
      fields: [dockerBridgeTunnelsTable.userId],
      references: [usersTable.id],
    }),
    dockerHost: one(dockerHostsTable, {
      fields: [dockerBridgeTunnelsTable.hostId],
      references: [dockerHostsTable.id],
    }),
  }),
)

export type DockerBridgeTunnel = typeof dockerBridgeTunnelsTable.$inferSelect
export type NewDockerBridgeTunnel = typeof dockerBridgeTunnelsTable.$inferInsert
