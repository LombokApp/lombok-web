import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { USER_STORAGE_PROVISIONS_KEY } from 'src/server/constants/server.constants'
import type { UserStorageProvisionDTO } from 'src/server/dto/user-storage-provision.dto'
import { serverSettingsTable } from 'src/server/entities/server-configuration.entity'
import { buildAccessKeyHashId } from 'src/storage/access-key.utils'
import type { NewStorageLocation } from 'src/storage/entities/storage-location.entity'
import { storageLocationsTable } from 'src/storage/entities/storage-location.entity'
import type { NewUser } from 'src/users/entities/user.entity'
import { usersTable } from 'src/users/entities/user.entity'
import { v4 as uuidV4 } from 'uuid'

const sql = postgres(
  `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
)

if (
  !process.env.DEV_S3_ACCESS_KEY_ID ||
  !process.env.DEV_S3_SECRET_ACCESS_KEY ||
  !process.env.DEV_S3_BUCKET_NAME ||
  !process.env.DEV_S3_PREFIX ||
  !process.env.DEV_S3_REGION ||
  !process.env.DEV_S3_ENDPOINT ||
  !process.env.DEV_S3_LABEL
) {
  throw new Error('Set DEV_S3_* env vars before running the dev seed.')
}

const S3_CREDENTIALS = {
  accessKeyId: process.env.DEV_S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.DEV_S3_SECRET_ACCESS_KEY,
}

async function main(): Promise<void> {
  const USER_1_ID = 'ad619a15-7326-44e9-a68b-0170a3cf4a94'
  const USER_1_FOLDER_1_ID = '67137165-2df6-46a4-8770-ecc0deab39b5'
  const USER_1_FOLDER_2_ID = 'ea09b961-f7e0-4a24-899d-fe398edabe01'
  const ADMIN_1_ID = '3bc93392-d38f-4a59-8668-c16c5a9f3250'
  const ADMIN_1_FOLDER_1_ID = 'b85646a9-3c5c-40c6-afe8-6035fdb827da'
  const ADMIN_1_BIG_FOLDER_TEST_FOLDER_ID =
    'ddc0674b-2826-4bdd-aa9d-b0a3eed55a57'
  const db = drizzle(sql)
  const admin: NewUser = {
    id: ADMIN_1_ID,
    username: 'Admin1',
    email: 'admin1@example.com',
    passwordHash:
      '59d56e777172cf14d847408f57665ea5da81bd1a902169c78215686f4c9770fed036293d268e97b8c1a5a0ee008e24e330bf46847e5cdfe3fa2286381101c0cb',
    passwordSalt:
      'f919dbb85b901c1b7a713b47210a707abb8e7629a596f3ef9517535b2059db50622a6ddc57ee7eb8b2c1f2b7896fc5b2c0dc23807b7adb0dfac896779502f6db',
    isAdmin: true,
    emailVerified: true,
    createdAt: new Date('2023-11-01 22:49:00.93'),
    updatedAt: new Date('2023-11-01 22:49:00.93'),
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
    createdAt: new Date('2023-11-01 22:49:00.93'),
    updatedAt: new Date('2023-11-01 22:49:00.93'),
    permissions: [],
  }

  const data: NewUser[] = [admin, user]

  function buildDevSeedLocation(
    userId: string,
    prefix = '',
  ): NewStorageLocation {
    return {
      id: uuidV4(),
      ...S3_CREDENTIALS,
      bucket: process.env.DEV_S3_BUCKET_NAME ?? '',
      endpoint: process.env.DEV_S3_ENDPOINT ?? '',
      endpointDomain: new URL(process.env.DEV_S3_ENDPOINT ?? '').host,
      accessKeyHashId: buildAccessKeyHashId({
        ...S3_CREDENTIALS,
        endpoint: process.env.DEV_S3_ENDPOINT ?? '',
        region: process.env.DEV_S3_REGION ?? '',
      }),
      label: `${process.env.DEV_S3_ENDPOINT} ${process.env.DEV_S3_REGION} ${process.env.DEV_S3_ACCESS_KEY_ID}`,
      providerType: 'USER',
      region: process.env.DEV_S3_REGION ?? '',
      userId,
      createdAt: new Date('2023-11-01 22:49:00.93'),
      updatedAt: new Date('2023-11-01 22:49:00.93'),
      prefix,
    }
  }

  // eslint-disable-next-line no-console
  console.log('Seed start')
  const locationsMap = {
    user1Folder1Content: buildDevSeedLocation(
      USER_1_ID,
      'user-1-folder-1-prefix',
    ),
    user1Folder1Metadata: buildDevSeedLocation(
      USER_1_ID,
      `user-1-folder-1-prefix/.stellaris_folder_metadata_${USER_1_FOLDER_1_ID}`,
    ),
    user1Folder2Content: buildDevSeedLocation(
      USER_1_ID,
      'user-1-folder-2-prefix',
    ),
    user1Folder2Metadata: buildDevSeedLocation(
      USER_1_ID,
      `user-1-folder-2-prefix/.stellaris_folder_metadata_${USER_1_FOLDER_2_ID}`,
    ),
    admin1Folder1Content: buildDevSeedLocation(
      ADMIN_1_ID,
      'admin-1-folder-1-prefix',
    ),
    admin1Folder1Metadata: buildDevSeedLocation(
      ADMIN_1_ID,
      `admin-1-folder-1-prefix/.stellaris_folder_metadata_${ADMIN_1_FOLDER_1_ID}`,
    ),
    admin1BigFolderContent: buildDevSeedLocation(ADMIN_1_ID, 'big-folder-test'),
    admin1BigFolderMetadata: buildDevSeedLocation(
      ADMIN_1_ID,
      `big-folder-test/.stellaris_folder_metadata_${ADMIN_1_BIG_FOLDER_TEST_FOLDER_ID}`,
    ),
  }
  const locations = Object.keys(locationsMap).map(
    (locationName) => locationsMap[locationName as keyof typeof locationsMap],
  )

  await db.insert(usersTable).values(data)
  await db.insert(storageLocationsTable).values(locations)
  await db.insert(foldersTable).values({
    id: USER_1_FOLDER_1_ID,
    name: 'User1 Folder 1',
    contentLocationId: locationsMap.user1Folder1Content.id,
    metadataLocationId: locationsMap.user1Folder1Metadata.id,
    ownerId: USER_1_ID,
    createdAt: new Date('2023-11-01 22:49:00.93'),
    updatedAt: new Date('2023-11-01 22:49:00.93'),
  })
  await db.insert(foldersTable).values({
    id: USER_1_FOLDER_2_ID,
    name: 'User1 Folder 2',
    contentLocationId: locationsMap.user1Folder2Content.id,
    metadataLocationId: locationsMap.user1Folder2Metadata.id,
    ownerId: USER_1_ID,
    createdAt: new Date('2023-11-01 22:49:00.93'),
    updatedAt: new Date('2023-11-01 22:49:00.93'),
  })
  await db.insert(foldersTable).values({
    id: ADMIN_1_FOLDER_1_ID,
    name: 'Admin1 Folder',
    contentLocationId: locationsMap.admin1Folder1Content.id,
    metadataLocationId: locationsMap.admin1Folder1Content.id,
    ownerId: ADMIN_1_ID,
    createdAt: new Date('2023-11-01 22:49:00.93'),
    updatedAt: new Date('2023-11-01 22:49:00.93'),
  })
  await db.insert(foldersTable).values({
    id: ADMIN_1_BIG_FOLDER_TEST_FOLDER_ID,
    name: 'Big Folder Test',
    contentLocationId: locationsMap.admin1BigFolderContent.id,
    metadataLocationId: locationsMap.admin1BigFolderContent.id,
    ownerId: ADMIN_1_ID,
    createdAt: new Date('2023-11-01 22:49:00.93'),
    updatedAt: new Date('2023-11-01 22:49:00.93'),
  })
  // add server storage provisions
  const storageProvision: UserStorageProvisionDTO = {
    ...S3_CREDENTIALS,
    id: uuidV4(),
    bucket: process.env.DEV_S3_BUCKET_NAME ?? '',
    description:
      "An special dev only S3 location. Don't store anything sensitive here.",
    label: process.env.DEV_S3_LABEL ?? '',
    endpoint: process.env.DEV_S3_ENDPOINT ?? '',
    region: process.env.DEV_S3_REGION ?? '',
    prefix: process.env.DEV_S3_PREFIX,
    provisionTypes: ['CONTENT', 'METADATA'],
    accessKeyHashId: buildAccessKeyHashId({
      accessKeyId: S3_CREDENTIALS.accessKeyId,
      secretAccessKey: S3_CREDENTIALS.secretAccessKey,
      region: process.env.DEV_S3_REGION ?? '',
      endpoint: process.env.DEV_S3_ENDPOINT ?? '',
    }),
  }

  await db.insert(serverSettingsTable).values({
    key: USER_STORAGE_PROVISIONS_KEY.key,
    value: [storageProvision],
    createdAt: new Date('2023-11-01 22:49:00.93'),
    updatedAt: new Date('2023-11-01 22:49:00.93'),
  })
  // eslint-disable-next-line no-console
  console.log('Seed done')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exit(1)
  })
