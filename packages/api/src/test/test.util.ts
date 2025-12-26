import type { FolderDTO } from '@lombokapp/types'
import { SignedURLsRequestMethod } from '@lombokapp/types'
import type { Type } from '@nestjs/common'
import type { TestingModuleBuilder } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { eq } from 'drizzle-orm'
import fs from 'fs'
import type { Server } from 'http'
import path from 'path'
import { appsTable } from 'src/app/entities/app.entity'
import { AppService } from 'src/app/services/app.service'
import { JWTService } from 'src/auth/services/jwt.service'
import { KVService } from 'src/cache/kv.service'
import { WorkerJobService } from 'src/docker/services/worker-job.service'
import { EventService } from 'src/event/services/event.service'
import { OrmService, TEST_DB_PREFIX } from 'src/orm/orm.service'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import { HttpExceptionFilter } from 'src/shared/http-exception-filter'
import { configureS3Client } from 'src/storage/s3.service'
import { createS3PresignedUrls } from 'src/storage/s3.utils'
import { PlatformTaskService } from 'src/task/services/platform-task.service'
import { TaskService } from 'src/task/services/task.service'
import type { User } from 'src/users/entities/user.entity'
import { usersTable } from 'src/users/entities/user.entity'

import { ormConfig } from '../orm/config'
import { setApp, setAppInitializing } from '../shared/app-helper'
import { NoPrefixConsoleLogger } from '../shared/no-prefix-console-logger'
import type { TestApiClient, TestModule } from './test.types'
import { buildSupertestApiClient } from './test-api-client'

const MINIO_LOCAL_PATH = '/minio-test-data'
const MINIO_ACCESS_KEY_ID = 'testaccesskeyid'
const MINIO_SECRET_ACCESS_KEY = 'testsecretaccesskey'
const MINIO_ENDPOINT = 'http://miniotest:9000'
const MINIO_REGION = 'auto'

export async function buildTestModule({
  testModuleKey,
  overrides = [],
  debug,
  startServerOnPort,
}: {
  testModuleKey: string
  debug?: true
  startServerOnPort?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  overrides?: { token: any; value: unknown }[]
}) {
  if (
    typeof startServerOnPort === 'number' &&
    (startServerOnPort < 7000 || startServerOnPort > 9000)
  ) {
    throw new Error(
      'startServerOnPort must be a number between 7000 and 9000, and must not already be used by other tests',
    )
  }
  const dbName = `test_db_${testModuleKey}`
  const bucketPathsToRemove: string[] = []
  let httpServer: Server | undefined = undefined
  const { PlatformTestModule } = await import('src/test/platform-test.module')

  const initTestModuleWithOverrides = (
    _overrides: { token: symbol | string; value: unknown }[],
  ): TestingModuleBuilder => {
    const moduleBuilder = Test.createTestingModule({
      imports: [PlatformTestModule],
      providers: [],
    })
    return _overrides.reduce((acc, { token, value }) => {
      acc.overrideProvider(token).useValue(value)
      return acc
    }, moduleBuilder)
  }

  const logger = new NoPrefixConsoleLogger({
    colors: true,
    timestamp: true,
    logLevels:
      debug || process.env.LOG_LEVEL === 'DEBUG'
        ? ['log', 'error', 'warn', 'debug', 'verbose']
        : [],
  })

  const appPromise = initTestModuleWithOverrides([
    {
      token: ormConfig.KEY,
      value: { ...ormConfig(), dbName: `${TEST_DB_PREFIX}${dbName}` },
    },
    ...overrides,
  ])
    .compile()
    .then((moduleRef) => moduleRef.createNestApplication({ logger }))

  setAppInitializing(appPromise)

  const app = await appPromise
  app.useGlobalFilters(new HttpExceptionFilter())

  setApp(app)

  // Ensure all modules complete onModuleInit before using providers
  await app.enableShutdownHooks().init()

  if (typeof startServerOnPort === 'number') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    httpServer = await app.listen(startServerOnPort, '0.0.0.0', () => {
      logger.log(
        `API started and listening on port ${startServerOnPort}`,
        'TestModule Bootstrap',
      )
    })
  }

  const services = {
    jwtService: await app.resolve(JWTService),
    appService: await app.resolve(AppService),
    serverConfigurationService: await app.resolve(ServerConfigurationService),
    workerJobService: await app.resolve(WorkerJobService),
    platformTaskService: await app.resolve(PlatformTaskService),
    eventService: await app.resolve(EventService),
    taskService: await app.resolve(TaskService),
    ormService: await app.resolve(OrmService),
    kvService: await app.resolve(KVService),
  }

  // Truncate the DB after app init (migrations/initialization complete)
  await services.ormService.truncateAllTestTables()

  // Install apps from disk for tests (since installAppsOnStart may not be set in test env)
  await services.appService.installAllAppsFromDisk()

  async function initMinioTestBucket(
    createFiles: { objectKey: string; content: Buffer | string }[] = [],
  ) {
    const bucketName = `test-bucket-${(Math.random() + 1).toString(36).substring(7)}`
    const bucketPath = path.join(MINIO_LOCAL_PATH, bucketName)
    bucketPathsToRemove.push(bucketPath)

    if (fs.existsSync(bucketPath)) {
      throw new Error('Test bucket somehow already exists.')
    }

    fs.mkdirSync(bucketPath)

    const uploadUrls = createS3PresignedUrls(
      createFiles.map(({ objectKey }) => {
        return {
          accessKeyId: MINIO_ACCESS_KEY_ID,
          secretAccessKey: MINIO_SECRET_ACCESS_KEY,
          endpoint: MINIO_ENDPOINT,
          region: MINIO_REGION,
          bucket: bucketName,
          expirySeconds: 3000,
          method: SignedURLsRequestMethod.PUT,
          objectKey,
        }
      }),
    )

    await Promise.all(
      uploadUrls.map((uploadUrl, i) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const createFile = createFiles[i]!
        return fetch(uploadUrl, {
          method: 'PUT',
          body:
            typeof createFile.content === 'string'
              ? createFile.content
              : new Uint8Array(createFile.content),
        })
      }),
    )
    return bucketName
  }

  return {
    app,
    services,
    apiClient: buildSupertestApiClient(app),
    shutdown: async () => {
      // remove created minio buckets
      for (const p of bucketPathsToRemove) {
        fs.rmSync(p, { recursive: true })
      }

      // shutdown the app
      if (httpServer) {
        httpServer.close()
      }
      await app.close()
    },
    cleanupMinioTestBuckets: () => {
      for (const p of bucketPathsToRemove) {
        if (fs.existsSync(p)) {
          fs.rmSync(p, { recursive: true })
        }
      }
      bucketPathsToRemove.length = 0
    },
    resolveDep<T extends Type>(token: T) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      return app.resolve(token) as Promise<InstanceType<T>>
    },
    resetAppState: async () => {
      services.kvService.ops.flushall()
      await services.ormService.resetTestDb()
      await services.appService.installAllAppsFromDisk()
    },
    testS3ClientConfig: () => ({
      accessKeyId: MINIO_ACCESS_KEY_ID,
      secretAccessKey: MINIO_SECRET_ACCESS_KEY,
      endpoint: MINIO_ENDPOINT,
      region: MINIO_REGION,
    }),
    testS3Client: () =>
      configureS3Client({
        accessKeyId: MINIO_ACCESS_KEY_ID,
        secretAccessKey: MINIO_SECRET_ACCESS_KEY,
        endpoint: MINIO_ENDPOINT,
        region: MINIO_REGION,
      }),
    getAppIdentifierBySlug: async (slug: string) => {
      const _app = await services.ormService.db.query.appsTable.findFirst({
        where: eq(appsTable.slug, slug),
      })
      if (!_app) {
        throw new Error(`App with slug ${slug} not found`)
      }
      return _app.identifier
    },
    setServerStorageLocation: async () => {
      const bucketName = await initMinioTestBucket()
      await services.serverConfigurationService.setServerStorageAsAdmin(
        {
          isAdmin: true,
        } as User,
        {
          accessKeyId: MINIO_ACCESS_KEY_ID,
          secretAccessKey: MINIO_SECRET_ACCESS_KEY,
          endpoint: MINIO_ENDPOINT,
          region: MINIO_REGION,
          bucket: bucketName,
          prefix: '',
        },
      )
    },
    initMinioTestBucket,
    createS3PresignedUrls: (
      presignedRequests: {
        bucket: string
        objectKey: string
        method: SignedURLsRequestMethod
      }[],
    ) => {
      return createS3PresignedUrls(
        presignedRequests.map((presignedRequest) => ({
          endpoint: MINIO_ENDPOINT,
          accessKeyId: MINIO_ACCESS_KEY_ID,
          secretAccessKey: MINIO_SECRET_ACCESS_KEY,
          region: MINIO_REGION,
          bucket: presignedRequest.bucket,
          objectKey: presignedRequest.objectKey,
          method: presignedRequest.method,
          expirySeconds: 3000,
        })),
      )
    },
  }
}

export async function createTestUser(
  testModule: TestModule,
  {
    username,
    name,
    email,
    password,
    admin = false,
  }: {
    username: string
    email?: string
    name?: string
    password: string
    admin?: boolean
  },
): Promise<{
  session: { expiresAt: string; accessToken: string; refreshToken: string }
}> {
  const signupResponse = await testModule
    .apiClient()
    .POST('/api/v1/auth/signup', {
      body: {
        username,
        password,
        email: email ?? `${username}@example.com`,
      },
    })

  if (signupResponse.error) {
    throw new Error(
      `Signup failed [${signupResponse.error.code}]: ${signupResponse.error.message}`,
    )
  }

  if (admin) {
    await testModule.services.ormService.db
      .update(usersTable)
      .set({
        isAdmin: true,
        name,
      })
      .where(eq(usersTable.username, signupResponse.data.user.username))
  }

  const loginResponse = await testModule
    .apiClient()
    .POST('/api/v1/auth/login', {
      body: { login: username, password },
    })

  if (loginResponse.error) {
    throw new Error(
      `Login failed [${loginResponse.error.code}]: ${loginResponse.error.message}`,
    )
  }

  return loginResponse.data
}

export function testS3Location({
  bucketName,
  prefix = '',
}: {
  bucketName: string
  prefix?: string
}) {
  return {
    accessKeyId: MINIO_ACCESS_KEY_ID,
    secretAccessKey: MINIO_SECRET_ACCESS_KEY,
    endpoint: MINIO_ENDPOINT,
    bucket: bucketName,
    region: MINIO_REGION,
    prefix,
  }
}

export async function createTestFolder({
  accessToken,
  folderName,
  testModule,
  mockFiles,
  apiClient,
}: {
  testModule: TestModule | undefined
  folderName: string
  accessToken: string
  mockFiles: { objectKey: string; content: string }[]
  apiClient: TestApiClient
}): Promise<{
  folder: FolderDTO
}> {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const bucketName = await testModule!.initMinioTestBucket(mockFiles)
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const metadataBucketName = await testModule!.initMinioTestBucket()

  const folderCreateResponse = await apiClient(accessToken).POST(
    '/api/v1/folders',
    {
      body: {
        name: folderName,
        contentLocation: testS3Location({ bucketName }),
        metadataLocation: testS3Location({ bucketName: metadataBucketName }),
      },
    },
  )

  if (!folderCreateResponse.data?.folder) {
    throw new Error('Folder creation failed - no folder data in response')
  }

  return {
    folder: folderCreateResponse.data.folder,
  }
}

export async function reindexTestFolder({
  accessToken,
  folderId,
  apiClient,
}: {
  folderId: string
  accessToken: string
  apiClient: TestApiClient
}): Promise<void> {
  await apiClient(accessToken).POST('/api/v1/folders/{folderId}/reindex', {
    params: { path: { folderId } },
  })
}
