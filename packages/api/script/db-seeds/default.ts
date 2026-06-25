import crypto from 'crypto'
import { foldersTable } from 'src/folders/entities/folder.entity'
import type { LombokDatabase } from 'src/orm/orm.service'
import { serverSettingsTable } from 'src/server/entities/server-configuration.entity'
import { buildAccessKeyHashId } from 'src/storage/access-key.utils'
import { getEmbeddedS3Config } from 'src/storage/embedded-s3'
import { externalStorageProvisionsTable } from 'src/storage/entities/external-storage-provision.entity'
import type { NewUser } from 'src/users/entities/user.entity'
import { usersTable } from 'src/users/entities/user.entity'

// Dev demo bucket the seed wires up as an example External provision. Created by
// the dev entrypoint via GARAGE_EXTRA_BUCKETS.
const EXTERNAL_DEMO_BUCKET = 'external-demo'

export async function seed(db: LombokDatabase): Promise<void> {
  const embedded = getEmbeddedS3Config()
  if (!embedded) {
    throw new Error('Set EMBEDDED_S3_* env vars before running the dev seed.')
  }

  const SEED_DATE = new Date('2023-11-01 22:49:00.93')

  const USER_1_ID = 'ad619a15-7326-44e9-a68b-0170a3cf4a94'
  const USER_1_FOLDER_1_ID = '67137165-2df6-46a4-8770-ecc0deab39b5'
  const USER_1_FOLDER_2_ID = 'ea09b961-f7e0-4a24-899d-fe398edabe01'
  const ADMIN_1_ID = '3bc93392-d38f-4a59-8668-c16c5a9f3250'
  const ADMIN_1_FOLDER_1_ID = 'b85646a9-3c5c-40c6-afe8-6035fdb827da'
  const ADMIN_1_BIG_FOLDER_TEST_FOLDER_ID =
    'ddc0674b-2826-4bdd-aa9d-b0a3eed55a57'
  const admin: NewUser = {
    id: ADMIN_1_ID,
    username: 'demo',
    email: 'demo@example.com',
    passwordHash:
      '69e172d55c719f26eba9ba150dd77ab7d9d396ab425697fc35b14cedfb0c83ec575a7e57bd7ab271943ec1d17eed6eb07dcba4f00bbbca89cb4d2e2bb6fffce1',
    passwordSalt:
      '664be0faf8a7bbd6bf7e8a040f4b585b6c54be10935c0135a02ba1495da972783aa73732dd0c47b7138a1eadb3bffc8a86a3011eca4fb376419f1f8310e5a2d2',
    isAdmin: true,
    emailVerified: true,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    permissions: [],
  }
  const user: NewUser = {
    id: USER_1_ID,
    username: 'User1',
    email: 'user1@example.com',
    passwordHash:
      '10153ca0d6de5300ea85302b590de2ca07ad109877d39c28b08abdf5658af574d66882f7970bf2c8c7028adfff6ccccb1ecf53e9f54a8b606160a857ef3599e8',
    passwordSalt:
      'a9f9f1a61728e5bef8b445b6f44e9600fd8265f19a8effedaa422d2202398158c0347aa0c691f5316bf73fcadcb9519017b0a1269936a1c844009edfe0f404b0',
    isAdmin: false,
    emailVerified: true,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    permissions: [],
  }

  // eslint-disable-next-line no-console
  console.log('Seed start')

  await db.insert(usersTable).values([admin, user])

  // Demo folders are backed by the builtin (embedded) provision, so their
  // location columns are NULL — the location is resolved in memory.
  await db.insert(foldersTable).values([
    {
      id: USER_1_FOLDER_1_ID,
      name: 'User1 Folder 1',
      contentLocationId: null,
      metadataLocationId: null,
      ownerId: USER_1_ID,
      createdAt: SEED_DATE,
      updatedAt: SEED_DATE,
    },
    {
      id: USER_1_FOLDER_2_ID,
      name: 'User1 Folder 2',
      contentLocationId: null,
      metadataLocationId: null,
      ownerId: USER_1_ID,
      createdAt: SEED_DATE,
      updatedAt: SEED_DATE,
    },
    {
      id: ADMIN_1_FOLDER_1_ID,
      name: 'Admin1 Folder',
      contentLocationId: null,
      metadataLocationId: null,
      ownerId: ADMIN_1_ID,
      createdAt: SEED_DATE,
      updatedAt: SEED_DATE,
    },
    {
      id: ADMIN_1_BIG_FOLDER_TEST_FOLDER_ID,
      name: 'Big Folder Test',
      contentLocationId: null,
      metadataLocationId: null,
      ownerId: ADMIN_1_ID,
      createdAt: SEED_DATE,
      updatedAt: SEED_DATE,
    },
  ])

  // One example External provision, pointing at the dev demo bucket. Uses the
  // embedded key (same single Garage node), but a different bucket.
  await db.insert(externalStorageProvisionsTable).values({
    id: crypto.randomUUID(),
    label: 'Garage (dev external)',
    description:
      "A dev-only External S3 provision. Don't store anything sensitive here.",
    endpoint: embedded.endpoint,
    bucket: EXTERNAL_DEMO_BUCKET,
    region: embedded.region,
    accessKeyId: embedded.accessKeyId,
    secretAccessKey: embedded.secretAccessKey,
    accessKeyHashId: buildAccessKeyHashId({
      accessKeyId: embedded.accessKeyId,
      secretAccessKey: embedded.secretAccessKey,
      region: embedded.region,
      endpoint: embedded.endpoint,
    }),
    prefix: null,
    provisionTypes: ['CONTENT', 'METADATA'],
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  })

  // Mark seed as applied (used by db:seed:auto to skip re-seeding)
  await db.insert(serverSettingsTable).values({
    key: '_dev_seed_applied',
    value: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // eslint-disable-next-line no-console
  console.log('Seed done')
}
