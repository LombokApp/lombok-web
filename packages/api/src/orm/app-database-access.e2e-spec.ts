import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { folderSharesTable } from 'src/folders/entities/folder-share.entity'
import { SHARED_ACL_FOLDER_VIEW, SHARED_ACL_SCHEMA } from 'src/orm/constants'
import { storageLocationsTable } from 'src/storage/entities/storage-location.entity'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'
import { usersTable } from 'src/users/entities/user.entity'

const TEST_MODULE_KEY = 'orm_schema_isolation'

describe('ORM Schema Isolation', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
    apiClient = testModule.apiClient
  })

  afterEach(() => testModule?.resetAppState())

  it('should not interfere with main app queries after app queries', async () => {
    const ormService = testModule!.getOrmService()
    const testAppId = 'testapp'

    // Ensure the test app schema exists
    await ormService.ensureAppSchema(testAppId)

    // Create a test table in the app schema
    await ormService.executeExecForApp(
      testAppId,
      `
      CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255)
      )
    `,
    )

    // Insert some data into the app's table
    await ormService.executeExecForApp(
      testAppId,
      `
      INSERT INTO test_table (name) VALUES ('test data')
    `,
    )

    // Query the app's table
    const appResult = await ormService.executeQueryForApp<{ name: string }>(
      testAppId,
      `
      SELECT * FROM test_table WHERE name = 'test data'
    `,
      [],
      'object',
    )
    // Verify the app query worked
    expect(appResult.rows.length).toBe(1)
    expect(appResult.rows[0].name).toBe('test data')

    // Now try to query the main app's tables (should still work)
    // This would fail if the search path wasn't properly isolated
    const mainAppResult = await ormService.client.query<{ test_value: number }>(
      'SELECT 1 as test_value',
    )

    // Verify the main app query still works
    expect(mainAppResult.rows.length).toBe(1)
    expect(mainAppResult.rows[0].test_value).toBe(1)

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
    await ormService.dropAppSchema(testAppId)
  })

  it('should handle batch operations with proper isolation', async () => {
    const ormService = testModule!.getOrmService()
    const testAppId = 'testapp_batch'

    // Ensure the test app schema exists
    await ormService.ensureAppSchema(testAppId)

    // Create a test table
    await ormService.executeExecForApp(
      testAppId,
      `
      CREATE TABLE IF NOT EXISTS batch_test (
        id SERIAL PRIMARY KEY,
        value INTEGER
      )
    `,
    )

    // Execute batch operations (atomic)
    const batchResult = await ormService.executeBatchForApp(
      testAppId,
      [
        { sql: `INSERT INTO batch_test (value) VALUES (1)`, kind: 'exec' },
        { sql: `INSERT INTO batch_test (value) VALUES (2)`, kind: 'exec' },
        { sql: `INSERT INTO batch_test (value) VALUES (3)`, kind: 'exec' },
        { sql: `SELECT COUNT(*) as count FROM batch_test`, kind: 'query' },
      ],
      true, // atomic = true
    )

    // Check that select result is correct
    const selectResult = await ormService.executeQueryForApp<{ value: number }>(
      testAppId,
      `SELECT * FROM batch_test ORDER BY id`,
      [],
      'object',
    )
    expect(selectResult.rows.length).toBe(3)
    expect(selectResult.rows[0].value).toBe(1)
    expect(selectResult.rows[1].value).toBe(2)
    expect(selectResult.rows[2].value).toBe(3)

    // Verify batch operations worked
    expect(batchResult.results.length).toBe(4)
    expect(
      Number((batchResult.results[3] as { count: string }[])[0].count),
    ).toBe(3)

    // Verify main app queries still work
    const mainAppResult = await ormService.client.query<{ test_value: number }>(
      'SELECT 1 as test_value',
    )
    expect(mainAppResult.rows.length).toBe(1)
    expect(mainAppResult.rows[0].test_value).toBe(1)

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
    await ormService.dropAppSchema(testAppId)
  })

  it('should handle multiple concurrent app schemas without interference', async () => {
    const ormService = testModule!.getOrmService()
    const app1Id = 'concurrent_app_1'
    const app2Id = 'concurrent_app_2'

    // Ensure both app schemas exist
    await ormService.ensureAppSchema(app1Id)
    await ormService.ensureAppSchema(app2Id)

    // Create tables in both schemas
    await ormService.executeExecForApp(
      app1Id,
      `
      CREATE TABLE IF NOT EXISTS app1_table (
        id SERIAL PRIMARY KEY,
        value VARCHAR(255)
      )
    `,
    )

    await ormService.executeExecForApp(
      app2Id,
      `
      CREATE TABLE IF NOT EXISTS app2_table (
        id SERIAL PRIMARY KEY,
        value VARCHAR(255)
      )
    `,
    )

    // Insert data into both schemas
    await ormService.executeExecForApp(
      app1Id,
      `INSERT INTO app1_table (value) VALUES ('app1 data')`,
    )

    await ormService.executeExecForApp(
      app2Id,
      `INSERT INTO app2_table (value) VALUES ('app2 data')`,
    )

    // Query both schemas
    const app1Result = await ormService.executeQueryForApp<{ value: string }>(
      app1Id,
      `SELECT * FROM app1_table WHERE value = 'app1 data'`,
      [],
      'object',
    )

    const app2Result = await ormService.executeQueryForApp<{ value: string }>(
      app2Id,
      `SELECT * FROM app2_table WHERE value = 'app2 data'`,
      [],
      'object',
    )

    // Verify both queries worked correctly
    expect(app1Result.rows.length).toBe(1)
    expect(app1Result.rows[0].value).toBe('app1 data')

    expect(app2Result.rows.length).toBe(1)
    expect(app2Result.rows[0].value).toBe('app2 data')

    // Verify main app queries still work
    const mainAppResult = await ormService.client.query<{ test_value: number }>(
      'SELECT 1 as test_value',
    )
    expect(mainAppResult.rows.length).toBe(1)
    expect(mainAppResult.rows[0].test_value).toBe(1)

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
    await ormService.dropAppSchema(app1Id)
    await ormService.dropAppSchema(app2Id)
  })

  it('should prevent app queries from accessing other schemas', async () => {
    const ormService = testModule!.getOrmService()
    const appId = 'role_isolation_test'

    await ormService.ensureAppSchema(appId)

    await ormService.client.query(`
      CREATE TABLE IF NOT EXISTS public.cross_schema_guard (
        id SERIAL PRIMARY KEY,
        secret VARCHAR(255)
      )
    `)
    await ormService.client.query(
      `INSERT INTO public.cross_schema_guard (secret) VALUES ('top-secret')`,
    )

    await ormService.executeExecForApp(
      appId,
      `
      CREATE TABLE IF NOT EXISTS own_table (
        id SERIAL PRIMARY KEY,
        value TEXT
      )
    `,
    )

    await ormService.executeExecForApp(
      appId,
      `INSERT INTO own_table (value) VALUES ('allowed')`,
    )

    const ownResult = await ormService.executeQueryForApp<{ value: string }>(
      appId,
      `SELECT value FROM own_table`,
      [],
      'object',
    )
    expect(ownResult.rows[0].value).toBe('allowed')

    expect(
      ormService.executeQueryForApp(
        appId,
        `SELECT * FROM public.cross_schema_guard`,
      ),
    ).rejects.toThrow(/permission denied/i)

    await ormService.dropAppSchema(appId)
    await ormService.client.query(
      `DROP TABLE IF EXISTS public.cross_schema_guard CASCADE`,
    )
  })

  it('should expose shared ACL view with owner and share entries', async () => {
    const ormService = testModule!.getOrmService()
    await ormService.ensureSharedAclSchema()

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
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    })

    const aclResult = await ormService.client.query<{
      folderId: string
      userId: string
      permissions: string[]
      isOwner: boolean
    }>(
      `
      SELECT "folderId", "userId", "permissions", "isOwner"
      FROM ${SHARED_ACL_SCHEMA}.${SHARED_ACL_FOLDER_VIEW}
      WHERE "folderId" = $1
      ORDER BY "isOwner" DESC
    `,
      [folderId],
    )

    expect(aclResult.rows).toHaveLength(2)
    const ownerEntry = aclResult.rows.find((row) => row.isOwner)
    const memberEntry = aclResult.rows.find((row) => !row.isOwner)
    expect(ownerEntry?.userId).toBe(owner.id)
    expect(ownerEntry?.permissions).toEqual(['owner'])
    expect(memberEntry?.userId).toBe(member.id)
    expect(memberEntry?.permissions).toEqual(['FOLDER_REINDEX'])
  })

  it('should handle app migrations with proper isolation', async () => {
    const ormService = testModule!.getOrmService()
    const testAppId = 'migration_test'

    // Ensure the test app schema exists
    await ormService.ensureAppSchema(testAppId)

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

    // Verify migrations worked
    const usersResult = await ormService.executeQueryForApp(
      testAppId,
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'app_${testAppId}' AND table_name = 'users'`,
      [],
    )

    const postsResult = await ormService.executeQueryForApp(
      testAppId,
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'app_${testAppId}' AND table_name = 'posts'`,
      [],
    )

    expect(usersResult.rows.length).toBe(1)
    expect(postsResult.rows.length).toBe(1)

    // Verify main app queries still work
    const mainAppResult = await ormService.client.query<{ test_value: number }>(
      'SELECT 1 as test_value',
    )
    expect(mainAppResult.rows.length).toBe(1)
    expect(mainAppResult.rows[0].test_value).toBe(1)

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
    await ormService.dropAppSchema(testAppId)
  })

  it('should handle rowMode array format correctly', async () => {
    const ormService = testModule!.getOrmService()
    const testAppId = 'rowmode_test'

    // Ensure the test app schema exists
    await ormService.ensureAppSchema(testAppId)

    // Create a test table
    await ormService.executeExecForApp(
      testAppId,
      `
      CREATE TABLE IF NOT EXISTS rowmode_test (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        value INTEGER
      )
    `,
    )

    // Insert test data
    await ormService.executeExecForApp(
      testAppId,
      `INSERT INTO rowmode_test (name, value) VALUES ('test1', 100)`,
    )
    await ormService.executeExecForApp(
      testAppId,
      `INSERT INTO rowmode_test (name, value) VALUES ('test2', 200)`,
    )

    // Test object mode (default) - should return objects
    const objectResult = await ormService.executeQueryForApp<{
      id: number
      name: string
      value: number
    }>(
      testAppId,
      `SELECT id, name, value FROM rowmode_test ORDER BY id`,
      [],
      'object',
    )

    // Verify object mode results
    expect(objectResult.rows.length).toBe(2)
    expect(objectResult.rows[0]).toEqual({ id: 1, name: 'test1', value: 100 })
    expect(objectResult.rows[1]).toEqual({ id: 2, name: 'test2', value: 200 })

    // Test array mode - should return arrays
    const arrayResult = await ormService.executeQueryForApp<
      [number, string, number]
    >(
      testAppId,
      `SELECT id, name, value FROM rowmode_test ORDER BY id`,
      [],
      'array',
    )

    // Verify array mode results
    expect(arrayResult.rows.length).toBe(2)
    expect(arrayResult.rows[0]).toEqual([1, 'test1', 100])
    expect(arrayResult.rows[1]).toEqual([2, 'test2', 200])

    // Test batch operations with mixed rowMode
    const batchResult = await ormService.executeBatchForApp(
      testAppId,
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
    expect((batchResult.results[1] as { count: string }[])[0].count).toBe('3')

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
    expect(mainAppResult.rows[0].test_value).toBe(1)

    // Clean up
    await ormService.dropAppSchema(testAppId)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
