import type { StorageProvisionType } from '@lombokapp/types'
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// Admin-defined ("External") storage provisions users can pick when creating
// folders. The always-present builtin (embedded Garage) provision is NOT stored
// here — it is synthesized in memory from the embedded credentials.
export const externalStorageProvisionsTable = pgTable(
  'external_storage_provisions',
  {
    id: uuid('id').primaryKey(),
    label: text('label').notNull(),
    description: text('description').notNull(),
    endpoint: text('endpoint').notNull(),
    bucket: text('bucket').notNull(),
    region: text('region').notNull(),
    accessKeyId: text('access_key_id').notNull(),
    secretAccessKey: text('secret_access_key').notNull(),
    accessKeyHashId: text('access_key_hash_id').notNull(),
    prefix: text('prefix'),
    provisionTypes: jsonb('provision_types')
      .notNull()
      .$type<StorageProvisionType[]>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('external_storage_provisions_access_key_hash_id_idx').on(
      table.accessKeyHashId,
    ),
  ],
)

export type ExternalStorageProvision =
  typeof externalStorageProvisionsTable.$inferSelect
export type NewExternalStorageProvision =
  typeof externalStorageProvisionsTable.$inferInsert
