import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { v4 as uuidV4 } from 'uuid'

import { foldersTable } from '../src/domains/folder/entities/folder.entity'
import type { NewStorageLocation } from '../src/domains/storage-location/entities/storage-location.entity'
import { storageLocationsTable } from '../src/domains/storage-location/entities/storage-location.entity'
import type { NewUser } from '../src/domains/user/entities/user.entity'
import { usersTable } from '../src/domains/user/entities/user.entity'

const sql = postgres(
  `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
)

async function main(): Promise<void> {
  const USER_1_ID = 'ad619a15-7326-44e9-a68b-0170a3cf4a94'
  const USER_1_FOLDER_ID = '67137165-2df6-46a4-8770-ecc0deab39b5'
  const ADMIN_1_ID = '3bc93392-d38f-4a59-8668-c16c5a9f3250'
  const ADMIN_1_FOLDER_ID = 'b85646a9-3c5c-40c6-afe8-6035fdb827da'
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

  function buildDevSeedLocation(userId: string): NewStorageLocation {
    return {
      id: uuidV4(),
      accessKeyId: '2ZpHPnybEUM0GtzD',
      secretAccessKey: 'HyLwLLCwEw9ni888fQvHENgMxelgNrAO',
      bucket: 'stellaris-dev',
      endpoint: 'https://m8.wasteofpaper.com',
      name: 'https://m8.wasteofpaper.com utrecht-1 2ZpHPnybEUM0GtzD',
      providerType: 'USER',
      region: 'utrecht-1',
      userId,
      createdAt: new Date('2023-11-01 22:49:00.93'),
      updatedAt: new Date('2023-11-01 22:49:00.93'),
      prefix: '',
    }
  }

  console.log('Seed start')

  const storageLocations = [
    buildDevSeedLocation(USER_1_ID),
    {
      ...buildDevSeedLocation(USER_1_ID),
      prefix: `.stellaris_folder_metadata_${uuidV4()}`,
    },
    buildDevSeedLocation(ADMIN_1_ID),
    {
      ...buildDevSeedLocation(ADMIN_1_ID),
      prefix: `.stellaris_folder_metadata_${uuidV4()}`,
    },
  ]

  await db.insert(usersTable).values(data)
  await db.insert(storageLocationsTable).values(storageLocations)
  await db.insert(foldersTable).values({
    id: USER_1_FOLDER_ID,
    name: 'User1Folder',
    contentLocationId: storageLocations[0].id,
    metadataLocationId: storageLocations[1].id,
    ownerId: USER_1_ID,
    createdAt: new Date('2023-11-01 22:49:00.93'),
    updatedAt: new Date('2023-11-01 22:49:00.93'),
  })
  await db.insert(foldersTable).values({
    id: ADMIN_1_FOLDER_ID,
    name: 'Admin1Folder',
    contentLocationId: storageLocations[2].id,
    metadataLocationId: storageLocations[3].id,
    ownerId: ADMIN_1_ID,
    createdAt: new Date('2023-11-01 22:49:00.93'),
    updatedAt: new Date('2023-11-01 22:49:00.93'),
  })
  console.log('Seed done')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
