import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { appsTable } from 'src/app/entities/app.entity'
import { appFolderSettingsTable } from 'src/app/entities/app-folder-settings.entity'
import { appUserSettingsTable } from 'src/app/entities/app-user-settings.entity'
import { dockerProfileResourceAssignmentsTable } from 'src/docker/entities/docker-profile-resource-assignment.entity'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestUser,
  seedDockerHost,
} from 'src/test/test.util'
import { usersTable } from 'src/users/entities/user.entity'
import { DUMMY_APP_SLUG } from 'test/e2e.contants'

const TEST_MODULE_KEY = 'app_uninstall'

const SOCKET_TEST_APP_SLUG = 'sockettestapp'

const findAppBySlug = async (testModule: TestModule, slug: string) => {
  const app = await testModule.services.ormService.db.query.appsTable.findFirst(
    {
      where: eq(appsTable.slug, slug),
    },
  )
  if (!app) {
    throw new Error(`App not found by slug: ${slug}`)
  }
  return app
}

describe('App Uninstall', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetAppState()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  it('should require authentication for uninstall', async () => {
    const res = await apiClient().DELETE(
      '/api/v1/server/apps/{appIdentifier}',
      { params: { path: { appIdentifier: 'fake-app-00000000' } } },
    )
    expect(res.response.status).toBe(401)
  })

  it('should require admin for uninstall', async () => {
    await testModule!.installLocalAppBundles([DUMMY_APP_SLUG])
    const app = await findAppBySlug(testModule!, DUMMY_APP_SLUG)

    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'uninst_user',
      password: '123',
    })

    const res = await apiClient(accessToken).DELETE(
      '/api/v1/server/apps/{appIdentifier}',
      { params: { path: { appIdentifier: app.identifier } } },
    )
    expect(res.response.status).toBe(401)
  })

  it('should return 404 for non-existent app', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'uninst_404',
      password: '123',
      admin: true,
    })

    const res = await apiClient(accessToken).DELETE(
      '/api/v1/server/apps/{appIdentifier}',
      { params: { path: { appIdentifier: 'nonexistent-app-00000000' } } },
    )
    expect(res.response.status).toBe(404)
  })

  it('should uninstall an app as admin', async () => {
    await testModule!.installLocalAppBundles([DUMMY_APP_SLUG])
    const app = await findAppBySlug(testModule!, DUMMY_APP_SLUG)

    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'uninst_admin',
      password: '123',
      admin: true,
    })

    await apiClient(accessToken).PUT(
      '/api/v1/server/apps/{appIdentifier}/enabled',
      {
        params: { path: { appIdentifier: app.identifier } },
        body: { enabled: true },
      },
    )

    const res = await apiClient(accessToken).DELETE(
      '/api/v1/server/apps/{appIdentifier}',
      { params: { path: { appIdentifier: app.identifier } } },
    )
    expect([200, 204]).toContain(res.response.status)

    const getRes = await apiClient(accessToken).GET(
      '/api/v1/server/apps/{appIdentifier}',
      { params: { path: { appIdentifier: app.identifier } } },
    )
    expect(getRes.response.status).toBe(404)
  })

  it('cascades to app_user_settings and app_folder_settings', async () => {
    await testModule!.installLocalAppBundles([DUMMY_APP_SLUG])
    const app = await findAppBySlug(testModule!, DUMMY_APP_SLUG)
    const db = testModule!.services.ormService.db

    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'uninst_cascade',
      password: '123',
      admin: true,
    })
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.username, 'uninst_cascade'),
    })
    if (!user) {
      throw new Error('test user not found after creation')
    }

    await apiClient(accessToken).PUT(
      '/api/v1/server/apps/{appIdentifier}/enabled',
      {
        params: { path: { appIdentifier: app.identifier } },
        body: { enabled: true },
      },
    )

    const now = new Date()
    await db.insert(appUserSettingsTable).values({
      userId: user.id,
      appId: app.id,
      enabled: true,
      permissions: [],
      createdAt: now,
      updatedAt: now,
    })

    const beforeUser = await db
      .select()
      .from(appUserSettingsTable)
      .where(eq(appUserSettingsTable.appId, app.id))
    expect(beforeUser.length).toBe(1)

    const res = await apiClient(accessToken).DELETE(
      '/api/v1/server/apps/{appIdentifier}',
      { params: { path: { appIdentifier: app.identifier } } },
    )
    expect([200, 204]).toContain(res.response.status)

    const afterUser = await db
      .select()
      .from(appUserSettingsTable)
      .where(eq(appUserSettingsTable.appId, app.id))
    expect(afterUser.length).toBe(0)

    const afterFolder = await db
      .select()
      .from(appFolderSettingsTable)
      .where(eq(appFolderSettingsTable.appId, app.id))
    expect(afterFolder.length).toBe(0)

    const afterApp = await db
      .select()
      .from(appsTable)
      .where(eq(appsTable.identifier, app.identifier))
    expect(afterApp.length).toBe(0)
  })

  it('cascades to docker_profile_resource_assignments', async () => {
    await testModule!.installLocalAppBundles(['testapp'])
    const app = await findAppBySlug(testModule!, 'testapp')
    const db = testModule!.services.ormService.db

    await seedDockerHost(testModule!, {
      profileAssignments: [
        {
          appIdentifier: app.identifier,
          profileKey: 'dummy_profile',
          config: {},
        },
      ],
    })

    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'uninst_docker',
      password: '123',
      admin: true,
    })

    const before = await db
      .select()
      .from(dockerProfileResourceAssignmentsTable)
      .where(eq(dockerProfileResourceAssignmentsTable.appId, app.id))
    expect(before.length).toBe(1)

    const res = await apiClient(accessToken).DELETE(
      '/api/v1/server/apps/{appIdentifier}',
      { params: { path: { appIdentifier: app.identifier } } },
    )
    expect([200, 204]).toContain(res.response.status)

    const after = await db
      .select()
      .from(dockerProfileResourceAssignmentsTable)
      .where(eq(dockerProfileResourceAssignmentsTable.appId, app.id))
    expect(after.length).toBe(0)
  })

  it('drops the per-app schema and role for db-enabled apps', async () => {
    await testModule!.installLocalAppBundles([SOCKET_TEST_APP_SLUG])
    const installed = await findAppBySlug(testModule!, SOCKET_TEST_APP_SLUG)
    const pg = testModule!.services.ormService.client

    const schemaName = `app_${installed.slug}_${installed.id}`
    const roleName = `app_role_${installed.slug}_${installed.id}`
    const kvKey = `app_role_password_${installed.slug}_${installed.id}`

    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'uninst_schema',
      password: '123',
      admin: true,
    })

    const schemaBefore = await pg.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
      [schemaName],
    )
    expect(schemaBefore.rows.length).toBe(1)

    const roleBefore = await pg.query(
      `SELECT rolname FROM pg_roles WHERE rolname = $1`,
      [roleName],
    )
    expect(roleBefore.rows.length).toBe(1)

    const res = await apiClient(accessToken).DELETE(
      '/api/v1/server/apps/{appIdentifier}',
      { params: { path: { appIdentifier: installed.identifier } } },
    )
    expect([200, 204]).toContain(res.response.status)

    const schemaAfter = await pg.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
      [schemaName],
    )
    expect(schemaAfter.rows.length).toBe(0)

    const roleAfter = await pg.query(
      `SELECT rolname FROM pg_roles WHERE rolname = $1`,
      [roleName],
    )
    expect(roleAfter.rows.length).toBe(0)

    expect(testModule!.services.kvService.ops.get(kvKey)).toBeUndefined()
  })

  it('allows reinstall after uninstall with a clean schema', async () => {
    await testModule!.installLocalAppBundles([SOCKET_TEST_APP_SLUG])
    const firstInstall = await findAppBySlug(testModule!, SOCKET_TEST_APP_SLUG)
    const pg = testModule!.services.ormService.client

    const firstId = firstInstall.id

    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'uninst_reinstall',
      password: '123',
      admin: true,
    })

    await apiClient(accessToken).DELETE('/api/v1/server/apps/{appIdentifier}', {
      params: { path: { appIdentifier: firstInstall.identifier } },
    })

    await testModule!.installLocalAppBundles([SOCKET_TEST_APP_SLUG])

    const reinstalled = await findAppBySlug(testModule!, SOCKET_TEST_APP_SLUG)
    // Reinstall picks up a fresh canonical id so the new role can't collide
    // with the previous (potentially leaked) one at the cluster level.
    expect(reinstalled.id).not.toBe(firstId)

    const schema = await pg.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
      [`app_${reinstalled.slug}_${reinstalled.id}`],
    )
    expect(schema.rows.length).toBe(1)

    const role = await pg.query(
      `SELECT rolname FROM pg_roles WHERE rolname = $1`,
      [`app_role_${reinstalled.slug}_${reinstalled.id}`],
    )
    expect(role.rows.length).toBe(1)
  })

  it('returns 404 on repeated uninstall', async () => {
    await testModule!.installLocalAppBundles([DUMMY_APP_SLUG])
    const app = await findAppBySlug(testModule!, DUMMY_APP_SLUG)

    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'uninst_repeat',
      password: '123',
      admin: true,
    })

    const first = await apiClient(accessToken).DELETE(
      '/api/v1/server/apps/{appIdentifier}',
      { params: { path: { appIdentifier: app.identifier } } },
    )
    expect([200, 204]).toContain(first.response.status)

    const second = await apiClient(accessToken).DELETE(
      '/api/v1/server/apps/{appIdentifier}',
      { params: { path: { appIdentifier: app.identifier } } },
    )
    expect(second.response.status).toBe(404)
  })
})
