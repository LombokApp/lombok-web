import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { PlatformRole } from '../src/domains/auth/constants/role.constants'
import { foldersTable } from '../src/domains/folder/entities/folder.entity'
import { storageLocationsTable } from '../src/domains/storage-location/entities/storage-location.entity'
import type { NewUser } from '../src/domains/user/entities/user.entity'
import { usersTable } from '../src/domains/user/entities/user.entity'

const sql = postgres(
  `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
)

async function main(): Promise<void> {
  const db = drizzle(sql)

  const data: NewUser[] = [
    {
      id: '7e4f1bde-520c-47a1-9085-98d304e2a14e',
      username: 'User1',
      email: 'user1@example.com',
      passwordHash:
        '10153ca0d6de5300ea85302b590de2ca07ad109877d39c28b08abdf5658af574d66882f7970bf2c8c7028adfff6ccccb1ecf53e9f54a8b606160a857ef3599e8',
      passwordSalt:
        'a9f9f1a61728e5bef8b445b6f44e9600fd8265f19a8effedaa422d2202398158c0347aa0c691f5316bf73fcadcb9519017b0a1269936a1c844009edfe0f404b0',
      role: PlatformRole.Admin,
      emailVerified: true,
      createdAt: new Date('2023-11-01 22:49:00.93'),
      updatedAt: new Date('2023-11-01 22:49:00.93'),
      permissions: [],
    },
  ]

  console.log('Seed start')
  await db.insert(usersTable).values(data)
  await db.insert(storageLocationsTable).values([
    {
      id: 'aa1ce62c-52e9-43f3-82f5-b0fc1d0dc544',
      accessKeyId: '2ZpHPnybEUM0GtzD',
      secretAccessKey: 'HyLwLLCwEw9ni888fQvHENgMxelgNrAO',
      bucket: 'stellaris-dev',
      endpoint: 'https://m8.wasteofpaper.com',
      name: 'https://m8.wasteofpaper.com utrecht-1 2ZpHPnybEUM0GtzD',
      providerType: 'USER',
      region: 'utrecht-1',
      userId: '7e4f1bde-520c-47a1-9085-98d304e2a14e',
      createdAt: new Date('2023-11-01 22:49:00.93'),
      updatedAt: new Date('2023-11-01 22:49:00.93'),
      prefix: '',
    },
    {
      id: 'afa56851-1e54-4d48-b397-55b37d69d814',
      accessKeyId: '2ZpHPnybEUM0GtzD',
      secretAccessKey: 'HyLwLLCwEw9ni888fQvHENgMxelgNrAO',
      bucket: 'stellaris-dev',
      endpoint: 'https://m8.wasteofpaper.com',
      name: 'https://m8.wasteofpaper.com utrecht-1 2ZpHPnybEUM0GtzD',
      providerType: 'USER',
      region: 'utrecht-1',
      userId: '7e4f1bde-520c-47a1-9085-98d304e2a14e',
      createdAt: new Date('2023-11-01 22:49:00.93'),
      updatedAt: new Date('2023-11-01 22:49:00.93'),
      prefix: '.stellaris_folder_metadata_da59d084-8eb1-4f76-8131-7f34ec3949b8',
    },
  ])
  await db.insert(foldersTable).values({
    id: 'da59d084-8eb1-4f76-8131-7f34ec3949b8',
    name: 'User1Folder',
    contentLocationId: 'aa1ce62c-52e9-43f3-82f5-b0fc1d0dc544',
    metadataLocationId: 'afa56851-1e54-4d48-b397-55b37d69d814',
    ownerId: '7e4f1bde-520c-47a1-9085-98d304e2a14e',
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
