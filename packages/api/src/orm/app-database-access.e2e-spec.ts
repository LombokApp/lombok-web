import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import type pg from 'pg'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { folderSharesTable } from 'src/folders/entities/folder-share.entity'
import {
  SHARED_FOLDER_ACL_FOLDER_VIEW,
  SHARED_FOLDER_ACL_SCHEMA,
} from 'src/orm/constants'
import { storageLocationsTable } from 'src/storage/entities/storage-location.entity'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'
import { usersTable } from 'src/users/entities/user.entity'

import type { IAppPlatformService } from '../../../app-worker-sdk'
import { LombokAppPgClient } from '../../../app-worker-sdk'
import type { OrmService } from './orm.service'

const TEST_MODULE_KEY = 'orm_schema_isolation'

const SOCKET_TEST_APP_NO_DB_SLUG = 'sockettestappnodb'
const TEST_APP_SLUG = 'testapp'
const SOCKET_TEST_APP_SLUG = 'sockettestapp'

// Helper to create a mock IAppPlatformService for a specific app
function createMockAppPlatformService(
  ormService: OrmService,
  appIdentifier: string,
): IAppPlatformService {
  return {
    getServerBaseUrl: () => 'http://localhost',
    getLatestDbCredentials: async () => {
      const creds = await ormService.getLatestDbCredentials(appIdentifier)
      return { result: creds }
    },
    emitEvent: () => {
      throw new Error('Not implemented in test mock')
    },
    saveLogEntry: () => {
      throw new Error('Not implemented in test mock')
    },
    authenticateUser: () => {
      throw new Error('Not implemented in test mock')
    },
    getMetadataSignedUrls: () => {
      throw new Error('Not implemented in test mock')
    },
    getContentSignedUrls: () => {
      throw new Error('Not implemented in test mock')
    },
    getAppStorageSignedUrls: () => {
      throw new Error('Not implemented in test mock')
    },
    getAppUserAccessToken: () => {
      throw new Error('Not implemented in test mock')
    },
    updateContentMetadata: () => {
      throw new Error('Not implemented in test mock')
    },
    executeAppDockerJob: () => {
      throw new Error('Not implemented in test mock')
    },
    triggerAppTask: () => {
      throw new Error('Not implemented in test mock')
    },
  }
}

// Helper to create a LombokAppPgClient for a specific app
function createAppPgClient(
  ormService: OrmService,
  appIdentifier: string,
): LombokAppPgClient {
  const mockServer = createMockAppPlatformService(ormService, appIdentifier)
  return new LombokAppPgClient(mockServer)
}

// Helper to execute a query with array rowMode
async function queryWithRowMode<T>(
  client: LombokAppPgClient,
  sql: string,
  _rowMode: 'array',
): Promise<{ rows: T[] }> {
  // Access the pool directly to use rowMode
  const pool = (client as unknown as { pool?: pg.Pool }).pool
  if (!pool) {
    // Ensure pool is initialized
    await client.query('SELECT 1')
    const poolAfterInit = (client as unknown as { pool?: pg.Pool }).pool
    if (!poolAfterInit) {
      throw new Error('Pool not initialized')
    }
    const client_ = await poolAfterInit.connect()
    try {
      const result = await client_.query({
        text: sql,
        rowMode: 'array',
      })
      return { rows: result.rows as T[] }
    } finally {
      client_.release()
    }
  } else {
    const client_ = await pool.connect()
    try {
      const result = await client_.query({
        text: sql,
        rowMode: 'array',
      })
      return { rows: result.rows as T[] }
    } finally {
      client_.release()
    }
  }
}

// Helper to execute batch operations with support for rowMode
async function executeBatchForApp(
  client: LombokAppPgClient,
  operations: {
    sql: string
    kind: 'exec' | 'query'
    rowMode?: 'object' | 'array'
  }[],
  atomic: boolean,
): Promise<{ results: unknown[] }> {
  const pool = (client as unknown as { pool?: pg.Pool }).pool
  if (!pool) {
    // Ensure pool is initialized
    await client.query('SELECT 1')
    const poolAfterInit = (client as unknown as { pool?: pg.Pool }).pool
    if (!poolAfterInit) {
      throw new Error('Pool not initialized')
    }
    const client_ = await poolAfterInit.connect()
    const results: unknown[] = []

    try {
      if (atomic) {
        await client_.query('BEGIN')
      }

      for (const op of operations) {
        if (op.kind === 'exec') {
          const result = await client_.query(op.sql)
          results.push({ rowCount: result.rowCount })
        } else {
          // query
          const queryOptions = {
            text: op.sql,
            ...(op.rowMode === 'array' && { rowMode: 'array' as const }),
          }
          const result = await client_.query(queryOptions)
          results.push(result.rows)
        }
      }

      if (atomic) {
        await client_.query('COMMIT')
      }
    } catch (error) {
      if (atomic) {
        await client_.query('ROLLBACK')
      }
      throw error
    } finally {
      client_.release()
    }

    return { results }
  } else {
    const client_ = await pool.connect()
    const results: unknown[] = []

    try {
      if (atomic) {
        await client_.query('BEGIN')
      }

      for (const op of operations) {
        if (op.kind === 'exec') {
          const result = await client_.query(op.sql)
          results.push({ rowCount: result.rowCount })
        } else {
          // query
          const queryOptions = {
            text: op.sql,
            ...(op.rowMode === 'array' && { rowMode: 'array' as const }),
          }
          const result = await client_.query(queryOptions)
          results.push(result.rows)
        }
      }

      if (atomic) {
        await client_.query('COMMIT')
      }
    } catch (error) {
      if (atomic) {
        await client_.query('ROLLBACK')
      }
      throw error
    } finally {
      client_.release()
    }

    return { results }
  }
}

describe('ORM Schema Isolation', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
      // debug: true,
    })
    apiClient = testModule.apiClient
  })

  afterEach(() => testModule?.resetAppState())

  it('should not interfere with main app queries after app queries', async () => {
    await testModule!.installLocalAppBundles([TEST_APP_SLUG])

    const ormService = testModule!.services.ormService
    const testAppId = await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG)

    // Create a LombokAppPgClient for the app
    const appClient = createAppPgClient(ormService, testAppId)

    // Create a test table in the app schema
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255)
      )
    `)

    // Insert some data into the app's table
    await appClient.query(`
      INSERT INTO test_table (name) VALUES ('test data')
    `)

    // Query the app's table
    const appResult = await appClient.query(`
      SELECT * FROM test_table WHERE name = 'test data'
    `)
    // Verify the app query worked
    expect(appResult.rows.length).toBe(1)
    expect((appResult.rows[0] as { name: string }).name).toBe('test data')

    // Now try to query the main app's tables (should still work)
    // This would fail if the search path wasn't properly isolated
    const mainAppResult = await ormService.client.query<{ test_value: number }>(
      'SELECT 1 as test_value',
    )

    // Verify the main app query still works
    expect(mainAppResult.rows.length).toBe(1)
    expect(mainAppResult.rows[0]?.test_value).toBe(1)

    // Test that we can still access main app tables through the API
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
      admin: true,
    })

    const appsListResponse = await apiClient(accessToken).GET(
      '/api/v1/server/apps',
    )

    expect(appsListResponse.response.status).toEqual(200)
    expect(appsListResponse.data).toBeDefined()
    if (!appsListResponse.data) {
      throw new Error('No response data received')
    }
    expect(appsListResponse.data.result.length).toBeGreaterThan(0)

    // Clean up
    await appClient.end()
    await ormService.dropAppSchema(testAppId)
  })

  it('should handle batch operations with proper isolation', async () => {
    await testModule!.installLocalAppBundles([TEST_APP_SLUG])
    const ormService = testModule!.services.ormService

    // Create a LombokAppPgClient for the app
    const appClient = createAppPgClient(ormService, TEST_APP_SLUG)

    // Create a test table
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS batch_test (
        id SERIAL PRIMARY KEY,
        value INTEGER
      )
    `)

    // Execute batch operations (atomic)
    const batchResult = await executeBatchForApp(
      appClient,
      [
        { sql: `INSERT INTO batch_test (value) VALUES (1)`, kind: 'exec' },
        { sql: `INSERT INTO batch_test (value) VALUES (2)`, kind: 'exec' },
        { sql: `INSERT INTO batch_test (value) VALUES (3)`, kind: 'exec' },
        { sql: `SELECT COUNT(*) as count FROM batch_test`, kind: 'query' },
      ],
      true, // atomic = true
    )

    // Check that select result is correct
    const selectResult = await appClient.query(
      `SELECT * FROM batch_test ORDER BY id`,
    )
    expect(selectResult.rows.length).toBe(3)
    expect((selectResult.rows[0] as { value: number }).value).toBe(1)
    expect((selectResult.rows[1] as { value: number }).value).toBe(2)
    expect((selectResult.rows[2] as { value: number }).value).toBe(3)

    // Verify batch operations worked
    expect(batchResult.results.length).toBe(4)
    expect(
      Number((batchResult.results[3] as { count: string }[])[0]?.count),
    ).toBe(3)

    // Verify main app queries still work
    const mainAppResult = await ormService.client.query<{ test_value: number }>(
      'SELECT 1 as test_value',
    )
    expect(mainAppResult.rows.length).toBe(1)
    expect(mainAppResult.rows[0]?.test_value).toBe(1)

    // Test API access still works
    const {
      session: { accessToken: _accessToken },
    } = await createTestUser(testModule!, {
      username: 'batchuser',
      password: '123',
    })

    const viewerResponse = await apiClient(_accessToken).GET('/api/v1/viewer')
    expect(viewerResponse.response.status).toEqual(200)
    expect(viewerResponse.data?.user.username).toBe('batchuser')

    // Clean up
    await appClient.end()
    await ormService.dropAppSchema(TEST_APP_SLUG)
  })

  it('should handle multiple concurrent app schemas without interference', async () => {
    const ormService = testModule!.services.ormService

    // Create LombokAppPgClient instances for both apps
    const app1Client = createAppPgClient(ormService, TEST_APP_SLUG)
    const app2Client = createAppPgClient(ormService, SOCKET_TEST_APP_SLUG)

    // Create tables in both schemas
    await app1Client.query(`
      CREATE TABLE IF NOT EXISTS app1_table (
        id SERIAL PRIMARY KEY,
        value VARCHAR(255)
      )
    `)

    await app2Client.query(`
      CREATE TABLE IF NOT EXISTS app2_table (
        id SERIAL PRIMARY KEY,
        value VARCHAR(255)
      )
    `)

    // Insert data into both schemas
    await app1Client.query(
      `INSERT INTO app1_table (value) VALUES ('app1 data')`,
    )

    await app2Client.query(
      `INSERT INTO app2_table (value) VALUES ('app2 data')`,
    )

    // Query both schemas
    const app1Result = await app1Client.query(
      `SELECT * FROM app1_table WHERE value = 'app1 data'`,
    )

    const app2Result = await app2Client.query(
      `SELECT * FROM app2_table WHERE value = 'app2 data'`,
    )

    // Verify both queries worked correctly
    expect(app1Result.rows.length).toBe(1)
    expect((app1Result.rows[0] as { value: string }).value).toBe('app1 data')

    expect(app2Result.rows.length).toBe(1)
    expect((app2Result.rows[0] as { value: string }).value).toBe('app2 data')

    // Verify main app queries still work
    const mainAppResult = await ormService.client.query<{ test_value: number }>(
      'SELECT 1 as test_value',
    )
    expect(mainAppResult.rows.length).toBe(1)
    expect(mainAppResult.rows[0]?.test_value).toBe(1)

    // Test API functionality
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'concurrentuser',
      password: '123',
    })

    const foldersResponse = await apiClient(accessToken).GET(
      '/api/v1/folders',
      {
        params: {
          query: {
            limit: 10,
            offset: 0,
          },
        },
      },
    )
    expect(foldersResponse.response.status).toEqual(200)

    // Clean up
    await app1Client.end()
    await app2Client.end()
  })

  it('should prevent app queries from accessing other schemas', async () => {
    await testModule!.installLocalAppBundles([SOCKET_TEST_APP_SLUG])
    const ormService = testModule!.services.ormService
    const appId = await testModule!.getAppIdentifierBySlug(SOCKET_TEST_APP_SLUG)

    await ormService.client.query(`
      CREATE TABLE IF NOT EXISTS public.cross_schema_guard (
        id SERIAL PRIMARY KEY,
        secret VARCHAR(255)
      )
    `)
    await ormService.client.query(
      `INSERT INTO public.cross_schema_guard (secret) VALUES ('top-secret')`,
    )

    // Create a LombokAppPgClient for the app
    const appClient = createAppPgClient(ormService, appId)

    await appClient.query(`
      CREATE TABLE IF NOT EXISTS own_table (
        id SERIAL PRIMARY KEY,
        value TEXT
      )
    `)

    await appClient.query(`INSERT INTO own_table (value) VALUES ('allowed')`)

    const ownResult = await appClient.query(`SELECT value FROM own_table`)
    expect((ownResult.rows[0] as { value: string }).value).toBe('allowed')

    expect(
      appClient.query(`SELECT * FROM public.cross_schema_guard`),
    ).rejects.toThrow(/permission denied/i)

    await appClient.end()
    await ormService.dropAppSchema(appId)
    await ormService.client.query(
      `DROP TABLE IF EXISTS public.cross_schema_guard CASCADE`,
    )
  })

  it('should expose shared ACL view with owner and share entries', async () => {
    const ormService = testModule!.services.ormService

    const ownerUsername = 'acl_owner'
    const memberUsername = 'acl_member'

    await createTestUser(testModule!, {
      username: ownerUsername,
      password: '123',
    })
    await createTestUser(testModule!, {
      username: memberUsername,
      password: '123',
    })

    const owner = await ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.username, ownerUsername),
    })
    const member = await ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.username, memberUsername),
    })

    if (!owner || !member) {
      throw new Error('Failed to create test users for shared ACL view')
    }

    const now = new Date()
    const makeLocation = (label: string) => ({
      id: randomUUID(),
      accessKeyHashId: randomUUID(),
      providerType: 'SERVER' as const,
      label,
      endpoint: 'https://example.com',
      endpointDomain: 'example.com',
      region: 'us-east-1',
      accessKeyId: randomUUID(),
      secretAccessKey: randomUUID(),
      bucket: `${label}-bucket`,
      prefix: 'root',
      userId: owner.id,
      createdAt: now,
      updatedAt: now,
    })

    const contentLocation = makeLocation('content')
    const metadataLocation = makeLocation('metadata')

    await ormService.db
      .insert(storageLocationsTable)
      .values([contentLocation, metadataLocation])

    const folderId = randomUUID()
    await ormService.db.insert(foldersTable).values({
      id: folderId,
      name: 'ACL Test Folder',
      contentLocationId: contentLocation.id,
      metadataLocationId: metadataLocation.id,
      ownerId: owner.id,
      createdAt: now,
      updatedAt: now,
    })

    await ormService.db.insert(folderSharesTable).values({
      folderId,
      userId: member.id,
      permissions: ['FOLDER_REINDEX'],
      createdAt: now,
      updatedAt: now,
    })

    const aclResult = await ormService.client.query<{
      folder_id: string
      user_id: string
      permissions: string[]
      is_owner: boolean
    }>(
      `
      SELECT "folder_id", "user_id", "permissions", "is_owner"
      FROM ${SHARED_FOLDER_ACL_SCHEMA}.${SHARED_FOLDER_ACL_FOLDER_VIEW}
      WHERE "folder_id" = $1
      ORDER BY "is_owner" DESC
    `,
      [folderId],
    )

    expect(aclResult.rows).toHaveLength(2)
    const ownerEntry = aclResult.rows.find((row) => row.is_owner)
    const memberEntry = aclResult.rows.find((row) => !row.is_owner)
    expect(ownerEntry?.user_id).toBe(owner.id)
    expect(ownerEntry?.permissions).toEqual(['owner'])
    expect(memberEntry?.user_id).toBe(member.id)
    expect(memberEntry?.permissions).toEqual(['FOLDER_REINDEX'])
  })

  it('should handle app migrations with proper isolation', async () => {
    await testModule!.installLocalAppBundles([TEST_APP_SLUG])
    const ormService = testModule!.services.ormService
    const testAppId = await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG)

    // Run app migrations
    const migrationFiles = [
      {
        filename: '001_create_users_table.sql',
        content: `
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL
          )
        `,
      },
      {
        filename: '002_create_posts_table.sql',
        content: `
          CREATE TABLE IF NOT EXISTS posts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            title VARCHAR(255) NOT NULL,
            content TEXT
          )
        `,
      },
    ]

    await ormService.runAppMigrations(testAppId, migrationFiles)

    // Create a LombokAppPgClient for the app
    const appClient = createAppPgClient(ormService, testAppId)

    // Verify migrations worked
    const usersResult = await appClient.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'app_${testAppId}' AND table_name = 'users'`,
    )

    const postsResult = await appClient.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'app_${testAppId}' AND table_name = 'posts'`,
    )

    expect(usersResult.rows.length).toBe(1)
    expect(postsResult.rows.length).toBe(1)

    // Verify main app queries still work
    const mainAppResult = await ormService.client.query<{ test_value: number }>(
      'SELECT 1 as test_value',
    )
    expect(mainAppResult.rows.length).toBe(1)
    expect(mainAppResult.rows[0]?.test_value).toBe(1)

    // Test API functionality
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'migrationuser',
      password: '123',
      admin: true,
    })

    const eventsResponse = await apiClient(accessToken).GET(
      '/api/v1/server/events',
      {
        params: {
          query: {
            limit: 10,
            offset: 0,
          },
        },
      },
    )
    expect(eventsResponse.response.status).toEqual(200)

    // Clean up
    await appClient.end()
    await ormService.dropAppSchema(testAppId)
  })

  it('should handle rowMode array format correctly', async () => {
    await testModule!.installLocalAppBundles([SOCKET_TEST_APP_SLUG])
    const ormService = testModule!.services.ormService
    const testAppId =
      await testModule!.getAppIdentifierBySlug(SOCKET_TEST_APP_SLUG)

    // Create a LombokAppPgClient for the app
    const appClient = createAppPgClient(ormService, testAppId)

    // Create a test table
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS rowmode_test (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        value INTEGER
      )
    `)

    // Insert test data
    await appClient.query(
      `INSERT INTO rowmode_test (name, value) VALUES ('test1', 100)`,
    )
    await appClient.query(
      `INSERT INTO rowmode_test (name, value) VALUES ('test2', 200)`,
    )

    // Test object mode (default) - should return objects
    const objectResult = await appClient.query(
      `SELECT id, name, value FROM rowmode_test ORDER BY id`,
    )

    // Verify object mode results
    expect(objectResult.rows.length).toBe(2)
    expect(objectResult.rows[0]).toEqual({ id: 1, name: 'test1', value: 100 })
    expect(objectResult.rows[1]).toEqual({ id: 2, name: 'test2', value: 200 })

    // Test array mode - should return arrays
    const arrayResult = await queryWithRowMode<[number, string, number]>(
      appClient,
      `SELECT id, name, value FROM rowmode_test ORDER BY id`,
      'array',
    )

    // Verify array mode results
    expect(arrayResult.rows.length).toBe(2)
    expect(arrayResult.rows[0]).toEqual([1, 'test1', 100])
    expect(arrayResult.rows[1]).toEqual([2, 'test2', 200])

    // Test batch operations with mixed rowMode
    const batchResult = await executeBatchForApp(
      appClient,
      [
        {
          sql: `INSERT INTO rowmode_test (name, value) VALUES ('test3', 300)`,
          kind: 'exec',
        },
        { sql: `SELECT COUNT(*) as count FROM rowmode_test`, kind: 'query' }, // object mode
        {
          sql: `SELECT id, name FROM rowmode_test WHERE name = 'test3'`,
          kind: 'query',
          rowMode: 'array',
        }, // array mode
      ],
      true, // atomic = true
    )

    // Verify batch results
    expect(batchResult.results.length).toBe(3)

    // First result is exec (rowCount)
    expect((batchResult.results[0] as { rowCount: number }).rowCount).toBe(1)

    // Second result is query in object mode
    expect((batchResult.results[1] as { count: string }[])[0]?.count).toBe('3')

    // Third result is query in array mode
    expect((batchResult.results[2] as [number, string][]).length).toBe(1)
    expect((batchResult.results[2] as [number, string][])[0]).toEqual([
      3,
      'test3',
    ])

    // Verify main app queries still work
    const mainAppResult = await ormService.client.query<{ test_value: number }>(
      'SELECT 1 as test_value',
    )
    expect(mainAppResult.rows.length).toBe(1)
    expect(mainAppResult.rows[0]?.test_value).toBe(1)

    // Clean up
    await appClient.end()
    await ormService.dropAppSchema(testAppId)
  })

  describe('Database Access Restrictions', () => {
    it('should have database field set to false for app without database enabled', async () => {
      await testModule!.installLocalAppBundles([SOCKET_TEST_APP_NO_DB_SLUG])
      const app = await testModule!.services.appService.getApp(
        await testModule!.getAppIdentifierBySlug(SOCKET_TEST_APP_NO_DB_SLUG),
      )

      expect(app).toBeDefined()
      if (!app) {
        throw new Error('App not found')
      }

      expect(app.database).toBe(false)
    })

    it('should have database field set to true for app with database enabled', async () => {
      await testModule!.installLocalAppBundles([SOCKET_TEST_APP_SLUG])
      const app = await testModule!.services.appService.getApp(
        await testModule!.getAppIdentifierBySlug(SOCKET_TEST_APP_SLUG),
      )

      expect(app).toBeDefined()
      if (!app) {
        throw new Error('App not found')
      }

      expect(app.database).toBe(true)
    })

    it('should allow ORM service methods for app with database enabled', async () => {
      await testModule!.installLocalAppBundles([SOCKET_TEST_APP_SLUG])
      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(SOCKET_TEST_APP_SLUG)
      const ormService = testModule!.services.ormService

      // Create a LombokAppPgClient for the app
      const appClient = createAppPgClient(ormService, appIdentifier)

      // Test query
      const queryResult = await appClient.query('SELECT 1 as test_value')
      expect(queryResult.rows.length).toBe(1)

      // Test exec
      const execResult = await appClient.query(
        'CREATE TABLE IF NOT EXISTS test_restriction_table (id SERIAL PRIMARY KEY)',
      )
      expect(execResult.rowCount).toBeDefined()

      // Test batch
      const batchResult = await executeBatchForApp(
        appClient,
        [
          {
            sql: 'SELECT 1 as test_value',
            kind: 'query',
          },
        ],
        false,
      )
      expect(batchResult.results.length).toBe(1)

      // Clean up
      await appClient.end()
    })

    it('should verify database restriction check logic correctly identifies restricted apps', async () => {
      await testModule!.installLocalAppBundles([
        SOCKET_TEST_APP_NO_DB_SLUG,
        SOCKET_TEST_APP_SLUG,
      ])

      const appService = testModule!.services.appService

      // Helper function to simulate the restriction check from socket handler
      const checkDatabaseAccess = async (appIdentifier: string) => {
        const app = await appService.getApp(appIdentifier, { enabled: true })
        if (!app) {
          return { allowed: false, reason: 'App not found' }
        }
        if (!app.database) {
          return {
            allowed: false,
            reason: 'Database is not enabled for this app.',
          }
        }
        return { allowed: true }
      }

      // App without database enabled should be restricted
      const checkWithoutDb = await checkDatabaseAccess(
        await testModule!.getAppIdentifierBySlug(SOCKET_TEST_APP_NO_DB_SLUG),
      )
      expect(checkWithoutDb.allowed).toBe(false)
      expect(checkWithoutDb.reason).toBe(
        'Database is not enabled for this app.',
      )

      // App with database enabled should be allowed
      const checkWithDb = await checkDatabaseAccess(
        await testModule!.getAppIdentifierBySlug(SOCKET_TEST_APP_SLUG),
      )
      expect(checkWithDb.allowed).toBe(true)
    })
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
