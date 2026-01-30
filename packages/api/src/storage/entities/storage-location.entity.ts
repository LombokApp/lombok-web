import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { usersTable } from 'src/users/entities/user.entity'

export const storageLocationsTable = pgTable(
  'storage_locations',
  {
    id: uuid('id').primaryKey(),
    accessKeyHashId: text('access_key_hash_id').notNull(),
    providerType: text('provider_type').notNull().$type<'SERVER' | 'USER'>(),
    label: text('label').notNull(),
    endpoint: text('endpoint').notNull(),
    endpointDomain: text('endpoint_domain').notNull(),
    region: text('region').notNull(),
    accessKeyId: text('access_key_id').notNull(),
    secretAccessKey: text('secret_access_key').notNull(),
    bucket: text('bucket').notNull(),
    prefix: text('prefix').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    index('storage_locations_user_id_idx').on(table.userId),
    index('storage_locations_access_key_hash_id_idx').on(table.accessKeyHashId),
    index('storage_locations_provider_type_idx').on(table.providerType),
    index('storage_locations_access_key_user_provider_idx').on(
      table.accessKeyHashId,
      table.userId,
      table.providerType,
    ),
  ],
)

export type StorageLocation = typeof storageLocationsTable.$inferSelect
export type NewStorageLocation = typeof storageLocationsTable.$inferInsert
