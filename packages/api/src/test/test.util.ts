import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import {
  DeleteBucketCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3'
import type { FolderDTO } from '@lombokapp/types'
import { SignedURLsRequestMethod } from '@lombokapp/types'
import { mimeFromExtension } from '@lombokapp/utils'
import type { Type } from '@nestjs/common'
import type * as nestjsConfig from '@nestjs/config'
import type { TestingModuleBuilder } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import crypto from 'crypto'
import type { SQL } from 'drizzle-orm'
import { and, count, eq, gt, inArray, isNotNull, not, or } from 'drizzle-orm'
import fs from 'fs'
import type { Server } from 'http'
import path from 'path'
import { appsTable } from 'src/app/entities/app.entity'
import { appInstallSequencesTable } from 'src/app/entities/app-install-sequence.entity'
import { AppService } from 'src/app/services/app.service'
import { deriveAppId } from 'src/app/utils/app-id.util'
import { JWTService } from 'src/auth/services/jwt.service'
import { KVService } from 'src/cache/kv.service'
import { CoreModule } from 'src/core/core.module'
import { waitForCondition } from 'src/core/utils/wait.util'
import { CoreWorkerService } from 'src/core-worker/core-worker.service'
import { dockerHostsTable } from 'src/docker/entities/docker-host.entity'
import {
  dockerProfileResourceAssignmentsTable,
  type DockerResourceConfig,
} from 'src/docker/entities/docker-profile-resource-assignment.entity'
import { DockerClientService } from 'src/docker/services/client/docker-client.service'
import { DockerWorkerHookService } from 'src/docker/services/docker-worker-hook.service'
import { buildMockDockerClientService } from 'src/docker/tests/docker.e2e-mocks'
import { EventService } from 'src/event/services/event.service'
import { FolderService } from 'src/folders/services/folder.service'
import { OrmService, TEST_DB_PREFIX } from 'src/orm/orm.service'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import { HttpExceptionFilter } from 'src/shared/http-exception-filter'
import { getLogLevelsFromMinimum } from 'src/shared/logger-levels.util'
import { runWithThreadContext } from 'src/shared/thread-context'
import { configureS3Client, S3Service } from 'src/storage/s3.service'
import { createS3PresignedUrls } from 'src/storage/s3.utils'
import { tasksTable } from 'src/task/entities/task.entity'
import { CoreTaskService } from 'src/task/services/core-task.service'
import { TaskService } from 'src/task/services/task.service'
import { usersTable } from 'src/users/entities/user.entity'

import { coreConfig } from '../core/config'
import { ormConfig } from '../orm/config'
import { setApp, setAppInitializing } from '../shared/app-helper'
import { NoPrefixConsoleLogger } from '../shared/no-prefix-console-logger'
import type { TestApiClient, TestModule } from './test.types'
import { buildSupertestApiClient } from './test-api-client'

// The single embedded Garage key (auto-generated, exported by test-entrypoint).
export const TEST_S3_ACCESS_KEY_ID = process.env.EMBEDDED_S3_ACCESS_KEY_ID ?? ''
export const TEST_S3_SECRET_ACCESS_KEY =
  process.env.EMBEDDED_S3_SECRET_ACCESS_KEY ?? ''
// Reverse-proxied through nginx (s3.<host>:8080), matching prod/dev. The
// in-container harness, browser and core-worker sandbox resolve s3.localhost to
// loopback via /etc/hosts (added by test-entrypoint.sh). Pinned to the same
// value as EMBEDDED_S3_ENDPOINT so builtin and ad-hoc locations agree.
export const TEST_S3_ENDPOINT =
  process.env.EMBEDDED_S3_ENDPOINT ?? 'http://s3.localhost:8080'
export const TEST_S3_REGION = process.env.EMBEDDED_S3_REGION ?? 'auto'

const execFileAsync = promisify(execFile)

// Create test buckets via the Garage CLI (global alias) rather than the S3
// CreateBucket API (key-local alias). Garage resolves a bucket's CORS rule for
// *unsigned* requests — i.e. the browser's CORS preflight — only through the
// global namespace, so a key-local bucket returns no Access-Control-Allow-*
// headers and the browser blocks the direct presigned upload.
//
// Point the CLI at the rendered runtime config: the shipped /etc/garage.toml
// (the CLI's default) still carries the {{GARAGE_API_BIND_ADDR}} placeholder,
// which the CLI can't parse. garage-provision.sh renders the substituted config
// to /var/lib/garage/garage.runtime.toml.
const garageCli = (...args: string[]) =>
  execFileAsync('garage', args, {
    timeout: 10_000,
    env: {
      ...process.env,
      GARAGE_CONFIG_FILE:
        process.env.GARAGE_CONFIG_FILE ?? '/var/lib/garage/garage.runtime.toml',
    },
  })

const mockDockerClientService = buildMockDockerClientService()

export async function buildTestModule({
  testModuleKey,
  overrides = [],
  debug,
  startServerOnPort,
  startCoreWorker = false,
}: {
  testModuleKey: string
  debug?: true
  startServerOnPort?: number
  startCoreWorker?: boolean
  overrides?: { token: symbol | string | Type; value: unknown }[]
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
  const bucketsToRemove: string[] = []

  // Per-suite namespaced system buckets, so suites sharing the single embedded
  // Garage node don't collide. The coreConfig provider is overridden below to
  // point the three system bucket names at these.
  const suiteBucketSuffix = crypto
    .createHash('sha256')
    .update(testModuleKey)
    .digest('hex')
    .slice(0, 12)
  const systemBuckets = {
    serverStorage: `server-storage-${suiteBucketSuffix}`,
    provisions: `provisions-${suiteBucketSuffix}`,
    uploads: `uploads-${suiteBucketSuffix}`,
  }

  const testS3AdminClient = () =>
    configureS3Client({
      accessKeyId: TEST_S3_ACCESS_KEY_ID,
      secretAccessKey: TEST_S3_SECRET_ACCESS_KEY,
      endpoint: TEST_S3_ENDPOINT,
      region: TEST_S3_REGION,
    })

  // Empty + drop test buckets over S3 (Garage storage is opaque — no fs rm).
  // Best-effort: bucket names are unique per call, so failures never collide.
  const removeTestBuckets = async (bucketNames: string[]) => {
    const s3Client = testS3AdminClient()
    await Promise.all(
      bucketNames.map(async (bucketName) => {
        try {
          let continuationToken: string | undefined = undefined
          do {
            const listed: ListObjectsV2CommandOutput = await s3Client.send(
              new ListObjectsV2Command({
                Bucket: bucketName,
                ContinuationToken: continuationToken,
              }),
            )
            await Promise.all(
              (listed.Contents ?? []).map((obj) =>
                s3Client.send(
                  new DeleteObjectCommand({ Bucket: bucketName, Key: obj.Key }),
                ),
              ),
            )
            continuationToken = listed.NextContinuationToken
          } while (continuationToken)
          await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }))
        } catch {
          // best-effort teardown
        }
      }),
    )
  }
  // Create a named global-alias bucket via the Garage CLI, grant the test key
  // full access, and (for browser-facing buckets) attach a permissive CORS rule.
  const provisionNamedBucket = async (
    bucketName: string,
    { cors }: { cors: boolean },
  ) => {
    if (
      await garageCli('bucket', 'info', bucketName).then(
        () => false,
        () => true,
      )
    ) {
      await garageCli('bucket', 'create', bucketName)
    }
    await garageCli(
      'bucket',
      'allow',
      '--read',
      '--write',
      '--owner',
      bucketName,
      '--key',
      TEST_S3_ACCESS_KEY_ID,
    )
    if (cors) {
      await testS3AdminClient().send(
        new PutBucketCorsCommand({
          Bucket: bucketName,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedOrigins: ['*'],
                AllowedMethods: ['GET', 'PUT', 'HEAD', 'DELETE'],
                AllowedHeaders: ['*'],
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3600,
              },
            ],
          },
        }),
      )
    }
  }

  let httpServer: Server | undefined = undefined

  // Stable, suite-unique starting position for app install sequences. Hashing
  // the suite key keeps it deterministic across runs (so failures reproduce
  // with the same ids) while giving each suite its own slice of the position
  // space — see installLocalAppBundles for why we need this.
  const suiteInstallSequenceOffset =
    crypto.createHash('sha256').update(testModuleKey).digest().readUInt32BE(0) %
    1_000_000_000

  const initTestModuleWithOverrides = (
    _overrides: { token: symbol | string | Type; value: unknown }[],
  ): TestingModuleBuilder => {
    const moduleBuilder = Test.createTestingModule({
      imports: [CoreModule],
      providers: [],
    })
    return _overrides.reduce((acc, { token, value }) => {
      acc.overrideProvider(token).useValue(value)
      return acc
    }, moduleBuilder)
  }

  const builtInOverrides: { token: symbol | string | Type; value: unknown }[] =
    [
      {
        token: DockerClientService,
        value: mockDockerClientService,
      },
      {
        token: ormConfig.KEY,
        value: { ...ormConfig(), dbName: `${TEST_DB_PREFIX}${dbName}` },
      },
      {
        token: coreConfig.KEY,
        value: {
          ...coreConfig(),
          disableCoreWorker: !startCoreWorker,
          // Namespace the system buckets for this suite.
          s3SystemBuckets: systemBuckets,
        },
      },
      // Point the core worker's loopback at the port this suite listens on,
      // so its callbacks reach the test server rather than the prod default.
      ...(typeof startServerOnPort === 'number'
        ? [{ token: 'INTERNAL_API_PORT', value: startServerOnPort }]
        : []),
    ]

  const logger = new NoPrefixConsoleLogger({
    colors: true,
    timestamp: true,
    logLevels:
      (process.env.LOG_LEVEL ?? '').length || debug
        ? getLogLevelsFromMinimum(process.env.LOG_LEVEL ?? 'DEBUG')
        : [],
  })

  const appPromise = initTestModuleWithOverrides([
    ...builtInOverrides.concat(overrides),
  ])
    .compile()
    .then((moduleRef) => moduleRef.createNestApplication({ logger }))

  setAppInitializing(appPromise)

  const app = await appPromise
  setApp(app)

  app.useGlobalFilters(new HttpExceptionFilter())
  app.use((req, _res, next) => {
    const requestId = crypto.randomUUID()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    runWithThreadContext(requestId, next)
  })

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
    coreWorkerService: await app.resolve(CoreWorkerService),
    appService: await app.resolve(AppService),
    serverConfigurationService: await app.resolve(ServerConfigurationService),
    dockerWorkerHookService: await app.resolve(DockerWorkerHookService),
    coreTaskService: await app.resolve(CoreTaskService),
    coreConfig: await app.resolve<nestjsConfig.ConfigType<typeof coreConfig>>(
      coreConfig.KEY,
    ),
    eventService: await app.resolve(EventService),
    taskService: await app.resolve(TaskService),
    folderService: await app.resolve(FolderService),
    s3Service: await app.resolve(S3Service),
    ormService: await app.resolve(OrmService),
    kvService: await app.resolve(KVService),
  }

  // Truncate the DB after app init (migrations/initialization complete)
  await services.ormService.truncateAllTestTables()

  // Provision this suite's namespaced system buckets (the embedded server
  // storage, builtin provision and staged uploads all resolve to these). Only
  // the browser-facing ones get a CORS rule; server-storage is server-side only.
  // These live for the whole suite — they are torn down at `shutdown`, NOT via
  // `cleanupMinioTestBuckets` (which empties `bucketsToRemove` between tests).
  const systemBucketNames = [
    systemBuckets.serverStorage,
    systemBuckets.provisions,
    systemBuckets.uploads,
  ]
  await provisionNamedBucket(systemBuckets.serverStorage, { cors: false })
  await provisionNamedBucket(systemBuckets.provisions, { cors: true })
  await provisionNamedBucket(systemBuckets.uploads, { cors: true })

  async function initMinioTestBucket(
    createFiles: { objectKey: string; content: Buffer | string }[] = [],
  ) {
    const bucketName = `test-bucket-${(Math.random() + 1).toString(36).substring(7)}`
    bucketsToRemove.push(bucketName)

    // Global-alias bucket via the CLI (see garageCli) + grant the test key
    // full access, mirroring how the dev/e2e default bucket is provisioned.
    await garageCli('bucket', 'create', bucketName)
    await garageCli(
      'bucket',
      'allow',
      '--read',
      '--write',
      '--owner',
      bucketName,
      '--key',
      TEST_S3_ACCESS_KEY_ID,
    )

    // Garage (unlike MinIO) has no permissive default CORS, and the app runs a
    // CORS preflight before browser uploads — so each test bucket needs a rule.
    await testS3AdminClient().send(
      new PutBucketCorsCommand({
        Bucket: bucketName,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: ['*'],
              AllowedMethods: ['GET', 'PUT', 'HEAD', 'DELETE'],
              AllowedHeaders: ['*'],
              ExposeHeaders: ['ETag'],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      }),
    )

    const uploadUrls = createS3PresignedUrls(
      createFiles.map(({ objectKey }) => {
        return {
          accessKeyId: TEST_S3_ACCESS_KEY_ID,
          secretAccessKey: TEST_S3_SECRET_ACCESS_KEY,
          endpoint: TEST_S3_ENDPOINT,
          region: TEST_S3_REGION,
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
        // Send a Content-Type like the browser does. Garage stores exactly the
        // header it receives (no application/octet-stream default), and the
        // analyze worker requires a content-type on the GET to hash the object.
        return fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type':
              mimeFromExtension(createFile.objectKey) ??
              'application/octet-stream',
          },
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
    waitForTasks: async (
      waitType: 'started' | 'completed' | 'attempted',
      options:
        | undefined
        | {
            timeoutMs?: number
          }
        | {
            taskIdentifiers: string[]
            timeoutMs?: number
          }
        | {
            taskIds: string[]
            timeoutMs?: number
          } = {
        timeoutMs: 5000,
      },
    ) => {
      await services.coreTaskService.startDrainCoreTasks()

      const condition: SQL =
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (
          waitType === 'started'
            ? or(
                gt(tasksTable.attemptCount, 0),
                isNotNull(tasksTable.startedAt),
              )
            : waitType === 'attempted'
              ? gt(tasksTable.attemptCount, 0)
              : isNotNull(tasksTable.completedAt)
        )!

      const baseQuery = services.ormService.db
        .select({
          count: count(),
        })
        .from(tasksTable)

      const taskFilterConditions =
        'taskIds' in options || 'taskIdentifiers' in options
          ? [
              ...('taskIdentifiers' in options
                ? [inArray(tasksTable.taskIdentifier, options.taskIdentifiers)]
                : []),
              ...('taskIds' in options
                ? [inArray(tasksTable.id, options.taskIds)]
                : []),
            ]
          : []

      await waitForCondition(
        async () => {
          const totalCountResult = await baseQuery.where(
            !taskFilterConditions.length
              ? undefined
              : taskFilterConditions.length === 1
                ? taskFilterConditions[0]
                : and(...taskFilterConditions),
          )

          const totalCount = totalCountResult[0]?.count ?? -1

          const result = await baseQuery.where(
            taskFilterConditions.length
              ? and(condition, ...taskFilterConditions)
              : not(condition),
          )
          return result[0]?.count === totalCount
        },
        'Tasks did not match expected count',
        {
          retryPeriodMs: 100,
          maxRetries: Math.ceil((options.timeoutMs ?? 5000) / 100),
          totalMaxDurationMs: options.timeoutMs ?? 5000,
        },
      )
    },
    apiClient: buildSupertestApiClient(app),
    shutdown: async () => {
      // Ad-hoc per-test buckets + the suite's long-lived system buckets.
      await removeTestBuckets([
        ...bucketsToRemove.splice(0),
        ...systemBucketNames,
      ])
      if (httpServer) {
        httpServer.close()
      }
      await app.close()
    },
    cleanupMinioTestBuckets: () => {
      // Fire-and-forget: this caller can't await.
      void removeTestBuckets(bucketsToRemove.splice(0))
    },
    resolveDep<T extends Type>(token: T) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      return app.resolve(token) as Promise<InstanceType<T>>
    },
    resetAppState: async () => {
      services.kvService.ops.flushall()
      await services.ormService.resetTestDb()
    },
    testS3ClientConfig: () => ({
      accessKeyId: TEST_S3_ACCESS_KEY_ID,
      secretAccessKey: TEST_S3_SECRET_ACCESS_KEY,
      endpoint: TEST_S3_ENDPOINT,
      region: TEST_S3_REGION,
    }),
    testS3Client: () =>
      configureS3Client({
        accessKeyId: TEST_S3_ACCESS_KEY_ID,
        secretAccessKey: TEST_S3_SECRET_ACCESS_KEY,
        endpoint: TEST_S3_ENDPOINT,
        region: TEST_S3_REGION,
      }),
    /**
     * Compute the identifier (composed `<slug>-<id>` form) of the first app
     * installed for `slug` in this test module. Pure: derived from the suite
     * install-sequence offset, no DB round trip. Holds as long as the slug
     * was first installed via `installLocalAppBundles` (which seeds the
     * sequence with `suiteInstallSequenceOffset`).
     */
    getInstalledAppIdentifier: (slug: string): string =>
      `${slug}-${deriveAppId(slug, suiteInstallSequenceOffset)}`,
    getInstalledApp: async (slug: string) => {
      const installedApp =
        await services.ormService.db.query.appsTable.findFirst({
          where: eq(appsTable.slug, slug),
        })
      if (!installedApp) {
        throw new Error(`App not installed for slug: ${slug}`)
      }
      return installedApp
    },
    installLocalAppBundles: async (limitTo: string[] | null = null) => {
      // Server storage resolves from the embedded config + this suite's
      // namespaced server-storage bucket (provisioned in buildTestModule), so
      // there's nothing to seed here.
      const appBundlesPath = process.env.APP_BUNDLES_PATH
      if (!appBundlesPath) {
        throw new Error(
          'APP_BUNDLES_PATH is not set; test environment cannot install local bundles',
        )
      }
      const zips = fs
        .readdirSync(appBundlesPath)
        .filter(
          (filename) =>
            !fs.lstatSync(path.join(appBundlesPath, filename)).isDirectory() &&
            filename.endsWith('.zip') &&
            (!limitTo ||
              limitTo.includes(filename.slice(0, filename.length - 4))),
        )
        .map((filename) => path.join(appBundlesPath, filename))
      // Seed per-slug install sequences with a suite-specific offset so that
      // bundles installed by different test suites get distinct deterministic
      // ids. Otherwise they all land on the same position-0 id, which collides
      // on cluster-scoped resources like the per-app Postgres role and breaks
      // role drops in any one suite while other suites still hold grants.
      for (const appBundlePath of zips) {
        const slug = path.basename(appBundlePath, '.zip')
        await services.ormService.db
          .insert(appInstallSequencesTable)
          .values({ slug, nextPosition: suiteInstallSequenceOffset })
          .onConflictDoNothing({ target: appInstallSequencesTable.slug })
      }
      for (const appBundlePath of zips) {
        try {
          await services.appService.handleAppInstall(
            {
              zipFileBuffer: fs.readFileSync(appBundlePath),
              zipFilename: path.basename(appBundlePath),
            },
            { mode: 'install' },
          )
        } catch (error) {
          // Match production behavior: log and continue so a malformed bundle
          // doesn't abort the whole batch.
          // eslint-disable-next-line no-console
          console.warn(`APP INSTALL ERROR ('${appBundlePath}'):`, error)
        }
      }
    },
    getInstalledAppsCount: async () => {
      const apps = await services.ormService.db.query.appsTable.findMany({
        where: eq(appsTable.enabled, true),
      })
      return apps.length
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
          endpoint: TEST_S3_ENDPOINT,
          accessKeyId: TEST_S3_ACCESS_KEY_ID,
          secretAccessKey: TEST_S3_SECRET_ACCESS_KEY,
          region: TEST_S3_REGION,
          bucket: presignedRequest.bucket,
          objectKey: presignedRequest.objectKey,
          method: presignedRequest.method,
          expirySeconds: 3000,
        })),
      )
    },
  }
}

export const TEST_DOCKER_HOST_ID = '00000000-0000-4000-8000-00000000d0c5'

export async function seedDockerHost(
  testModule: TestModule,
  {
    profileAssignments = [],
  }: {
    profileAssignments?: {
      appIdentifier: string
      profileKey: string
      config: DockerResourceConfig
    }[]
  } = {},
): Promise<{ hostId: string }> {
  const db = testModule.services.ormService.db
  const now = new Date()
  await db
    .insert(dockerHostsTable)
    .values({
      id: TEST_DOCKER_HOST_ID,
      label: 'Test Docker Host',
      type: 'docker_endpoint',
      host: '/var/run/docker.sock',
      isDefault: true,
      enabled: true,
      healthStatus: 'healthy',
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()

  for (const assignment of profileAssignments) {
    // Accept either slug or composed identifier — tests historically passed
    // the slug, which used to double as the identifier.
    const app =
      (await db.query.appsTable.findFirst({
        where: eq(appsTable.identifier, assignment.appIdentifier),
      })) ??
      (await db.query.appsTable.findFirst({
        where: eq(appsTable.slug, assignment.appIdentifier),
      }))
    if (!app) {
      throw new Error(`App not found: ${assignment.appIdentifier}`)
    }
    await db
      .insert(dockerProfileResourceAssignmentsTable)
      .values({
        id: crypto.randomUUID(),
        appId: app.id,
        profileKey: assignment.profileKey,
        dockerHostId: TEST_DOCKER_HOST_ID,
        config: assignment.config,
        configHashes: {},
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
  }

  return { hostId: TEST_DOCKER_HOST_ID }
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
        email,
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
  prefix = null,
}: {
  bucketName: string
  prefix?: string | null
}) {
  return {
    accessKeyId: TEST_S3_ACCESS_KEY_ID,
    secretAccessKey: TEST_S3_SECRET_ACCESS_KEY,
    endpoint: TEST_S3_ENDPOINT,
    bucket: bucketName,
    region: TEST_S3_REGION,
    prefix,
  }
}

export async function createTestFolder({
  accessToken,
  folderName,
  testModule,
  mockFiles = [],
  apiClient,
}: {
  testModule: TestModule | undefined
  folderName: string
  accessToken: string
  mockFiles?: { objectKey: string; content: string }[]
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
