import { spawn } from 'bun'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type { TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'
import request from 'supertest'
import type { App } from 'supertest/types'

import type { AppGetResponse } from '../dto/responses/app-get-response.dto'
import type { AppInstallResponse } from '../dto/responses/app-install-response.dto'
import { buildAppZip, createTestAppConfig } from './app-zip-builder.util'

const TEST_MODULE_KEY = 'apps_installation'

describe('Apps Installation via Zip', () => {
  let testModule: TestModule | undefined

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
      // debug: true,
    })
  })

  beforeEach(async () => {})

  afterEach(async () => {
    await testModule?.resetAppState()
  })

  it('should install a valid app from a zip file', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'admin',
      password: '123',
      admin: true,
    })

    const appSlug = `testapp${Date.now()}`
    const appLabel = 'Test App'

    // Build a valid app zip
    const zipBuffer = await buildAppZip({
      slug: appSlug,
      label: appLabel,
      config: createTestAppConfig(appSlug, appLabel),
      files: [
        {
          path: 'ui/index.html',
          content: '<html><body>Test App UI</body></html>',
        },
        {
          path: 'workers/test-worker.ts',
          content: 'export default function() { console.log("test"); }',
        },
      ],
    })

    // Install the app via the endpoint
    const response = await request(testModule!.app.getHttpServer() as App)
      .post('/api/v1/server/apps/install')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', zipBuffer, `${appSlug}.zip`)

    const responseBody = response.body as AppInstallResponse
    expect(response.status).toBe(201)
    expect(responseBody).toBeDefined()
    expect(responseBody.app).toBeDefined()
    expect(responseBody.app.slug).toBe(appSlug)
    expect(responseBody.app.label).toBe(appLabel)
    expect(responseBody.app.identifier).toMatch(
      new RegExp(`^${appSlug}-[a-f0-9]{8}$`),
    )
    expect(responseBody.app.id).toMatch(/^[a-f0-9]{8}$/)

    // Verify the app is installed by fetching it
    const getAppResponse = await request(testModule!.app.getHttpServer() as App)
      .get(`/api/v1/server/apps/${responseBody.app.identifier}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(getAppResponse.status).toBe(200)
    const getAppResponseBody = getAppResponse.body as AppGetResponse
    expect(getAppResponseBody.app.identifier).toBe(responseBody.app.identifier)
    expect(getAppResponseBody.app.slug).toBe(appSlug)
    expect(getAppResponseBody.app.label).toBe(appLabel)
  })

  it('should install an app with migrations', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'admin2',
      password: '123',
      admin: true,
    })

    const appSlug = `testappmigrations${Date.now()}`
    const appLabel = 'Test App with Migrations'

    // Build an app with database enabled and migrations
    const zipBuffer = await buildAppZip({
      slug: appSlug,
      label: appLabel,
      config: createTestAppConfig(appSlug, appLabel, {
        database: { enabled: true },
      }),
      migrations: [
        {
          filename: '20240101000000_create_test_table.sql',
          content: `
            CREATE TABLE IF NOT EXISTS test_table (
              id SERIAL PRIMARY KEY,
              name TEXT NOT NULL
            );
          `,
        },
      ],
    })

    // Install the app
    const response = await request(testModule!.app.getHttpServer() as App)
      .post('/api/v1/server/apps/install')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', zipBuffer, 'test-app-migrations.zip')

    expect(response.status).toBe(201)
    const responseBody = response.body as AppInstallResponse
    expect(responseBody.app.slug).toBe(appSlug)
    expect(responseBody.app.config.database?.enabled).toBe(true)
  })

  it('should reject installation without admin access', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'nonadmin',
      password: '123',
      admin: false,
    })

    const appSlug = `testappunauthorized${Date.now()}`
    const zipBuffer = await buildAppZip({
      slug: appSlug,
      label: 'Unauthorized Test App',
      config: createTestAppConfig(appSlug, 'Unauthorized Test App'),
    })

    const response = await request(testModule!.app.getHttpServer() as App)
      .post('/api/v1/server/apps/install')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', zipBuffer, 'test-app.zip')

    expect(response.status).toBe(401)
  })

  it('should reject invalid zip files', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'admin3',
      password: '123',
      admin: true,
    })

    // Try to upload a non-zip file
    const response = await request(testModule!.app.getHttpServer() as App)
      .post('/api/v1/server/apps/install')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', Buffer.from('not a zip file'), 'test.txt')

    expect(response.status).toBe(400)
  })

  it('should reject invalid zip files with .zip extension', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'admin4',
      password: '123',
      admin: true,
    })

    // Create an invalid zip (just a text file with .zip extension)
    // This will pass the file type check but fail during unzip
    const invalidZip = Buffer.from('invalid zip content')

    const response = await request(testModule!.app.getHttpServer() as App)
      .post('/api/v1/server/apps/install')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', invalidZip, 'invalid.zip')

    expect(response.status).toBe(400)
  })

  it('should reject valid zip files without config.json', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'admin7',
      password: '123',
      admin: true,
    })

    // Create a valid zip file but without config.json
    const tempDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'app-zip-test-'),
    )

    try {
      const appDir = path.join(tempDir, 'test-app')
      await fs.promises.mkdir(appDir, { recursive: true })

      // Empty app directory (no config.json) — installer should reject

      // Create a valid zip file
      const zipPath = path.join(tempDir, 'test-app.zip')
      const zipProc = spawn({
        cmd: ['zip', '-r', zipPath, 'test-app'],
        cwd: tempDir,
        stdout: 'inherit',
        stderr: 'inherit',
      })
      const zipCode = await zipProc.exited
      if (zipCode !== 0) {
        throw new Error(`Failed to create zip file: ${zipCode}`)
      }

      const zipBuffer = await fs.promises.readFile(zipPath)

      const response = await request(testModule!.app.getHttpServer() as App)
        .post('/api/v1/server/apps/install')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', zipBuffer, 'test-app.zip')

      expect(response.status).toBe(400)
      // The error should indicate that config.json is missing
      const responseBody = response.body as { message: string }
      expect(responseBody.message).toEqual(
        `App 'slug: n/a - (source: test-app.zip)': AppNotParsableException: Could not find app directory in zip file`,
      )
    } finally {
      await fs.promises.rm(tempDir, { recursive: true, force: true })
    }
  })

  it('should reject app installation with illegal characters in config.json', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'admin8',
      password: '123',
      admin: true,
    })

    const appSlug = `testappillegal${Date.now()}`
    const appLabel = 'Test App with Illegal Characters'

    // Build an app zip with a config containing illegal characters (NUL character)
    const invalidConfig = createTestAppConfig(appSlug, appLabel)
    // Add NUL character to the label field
    invalidConfig.label = `Test App\u0000with NUL`

    const zipBuffer = await buildAppZip({
      slug: appSlug,
      label: appLabel,
      config: invalidConfig,
    })

    const response = await request(testModule!.app.getHttpServer() as App)
      .post('/api/v1/server/apps/install')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', zipBuffer, 'test-app-illegal.zip')

    expect(response.status).toBe(400)
    const responseBody = response.body as { message: string }
    expect(responseBody.message).toBeDefined()
    // The error should indicate that the config is invalid due to illegal characters
    expect(responseBody.message).toContain('AppInvalidException')
    expect(responseBody.message).toContain('NUL character')
  })

  it('should produce structurally-unique identifiers when installing a zip whose slug is already taken', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'admin5',
      password: '123',
      admin: true,
    })

    const appSlug = `testappdupe${Date.now()}`
    const appLabel = 'Test App for Duplicate Install'

    const zipBuffer = await buildAppZip({
      slug: appSlug,
      label: appLabel,
      config: createTestAppConfig(appSlug, appLabel),
    })

    const response1 = await request(testModule!.app.getHttpServer() as App)
      .post('/api/v1/server/apps/install')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', zipBuffer, 'test-app.zip')
    expect(response1.status).toBe(201)
    const first = (response1.body as AppInstallResponse).app
    expect(first.identifier).toMatch(new RegExp(`^${appSlug}-[a-f0-9]{8}$`))
    expect(first.slug).toBe(appSlug)

    const response2 = await request(testModule!.app.getHttpServer() as App)
      .post('/api/v1/server/apps/install')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', zipBuffer, 'test-app.zip')
    expect(response2.status).toBe(201)
    const second = (response2.body as AppInstallResponse).app
    expect(second.identifier).not.toBe(first.identifier)
    expect(second.identifier).toMatch(new RegExp(`^${appSlug}-[a-f0-9]{8}$`))
    expect(second.slug).toBe(appSlug)
  })

  it('should upgrade an existing app via the upgrade endpoint', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'admin5b',
      password: '123',
      admin: true,
    })

    const appSlug = `testappupgrade${Date.now()}`
    const appLabel = 'Test App for Upgrade'

    const zipBuffer = await buildAppZip({
      slug: appSlug,
      label: appLabel,
      config: createTestAppConfig(appSlug, appLabel),
    })

    const installRes = await request(testModule!.app.getHttpServer() as App)
      .post('/api/v1/server/apps/install')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', zipBuffer, 'test-app.zip')
    expect(installRes.status).toBe(201)
    const installed = (installRes.body as AppInstallResponse).app

    const upgradeRes = await request(testModule!.app.getHttpServer() as App)
      .post(`/api/v1/server/apps/${installed.identifier}/upgrade`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', zipBuffer, 'test-app.zip')
    expect(upgradeRes.status).toBe(201)

    const upgraded = (upgradeRes.body as AppInstallResponse).app
    expect(upgraded.identifier).toBe(installed.identifier)
    expect(upgraded.slug).toBe(installed.slug)
    expect(new Date(upgraded.updatedAt).getTime()).toBeGreaterThan(
      new Date(installed.updatedAt).getTime(),
    )
  })

  it('should reject upgrade when zip slug differs from installed app slug', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'admin5c',
      password: '123',
      admin: true,
    })

    const slugA = `testupgradea${Date.now()}`
    const slugB = `testupgradeb${Date.now()}`

    const zipA = await buildAppZip({
      slug: slugA,
      label: 'A',
      config: createTestAppConfig(slugA, 'A'),
    })
    const zipB = await buildAppZip({
      slug: slugB,
      label: 'B',
      config: createTestAppConfig(slugB, 'B'),
    })

    const installA = await request(testModule!.app.getHttpServer() as App)
      .post('/api/v1/server/apps/install')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', zipA, 'a.zip')
    expect(installA.status).toBe(201)
    const installedA = (installA.body as AppInstallResponse).app

    const upgradeMismatch = await request(
      testModule!.app.getHttpServer() as App,
    )
      .post(`/api/v1/server/apps/${installedA.identifier}/upgrade`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', zipB, 'b.zip')
    expect(upgradeMismatch.status).toBe(400)
  })

  it('should return 404 when upgrading a non-existent app', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'admin5d',
      password: '123',
      admin: true,
    })

    const slug = `testupgrade404${Date.now()}`
    const zip = await buildAppZip({
      slug,
      label: 'X',
      config: createTestAppConfig(slug, 'X'),
    })

    const res = await request(testModule!.app.getHttpServer() as App)
      .post('/api/v1/server/apps/nonexistent-app/upgrade')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', zip, 'x.zip')
    expect(res.status).toBe(404)
  })

  it('should verify installed app contents match the zip', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'admin6',
      password: '123',
      admin: true,
    })

    const appSlug = `testappcontents${Date.now()}`
    const appLabel = 'Test App Contents'

    // Build app with specific files
    const testFiles = [
      {
        path: 'ui/index.html',
        content: '<html><body>Test Content</body></html>',
      },
      {
        path: 'ui/styles.css',
        content: 'body { color: red; }',
      },
      {
        path: 'workers/main.ts',
        content: 'export default function() { return "test"; }',
      },
    ]

    const zipBuffer = await buildAppZip({
      slug: appSlug,
      label: appLabel,
      config: createTestAppConfig(appSlug, appLabel),
      files: testFiles,
    })

    // Install the app
    const installResponse = await request(
      testModule!.app.getHttpServer() as App,
    )
      .post('/api/v1/server/apps/install')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', zipBuffer, 'test-app.zip')

    expect(installResponse.status).toBe(201)
    const installResponseBody = installResponse.body as AppInstallResponse
    const appIdentifier = installResponseBody.app.identifier

    // Verify the app was installed with correct manifest
    const getAppResponse = await request(testModule!.app.getHttpServer() as App)
      .get(`/api/v1/server/apps/${appIdentifier}`)
      .set('Authorization', `Bearer ${accessToken}`)

    const getAppResponseBody = getAppResponse.body as AppGetResponse

    expect(getAppResponse.status).toBe(200)

    // Verify manifest contains the files we added
    expect(getAppResponseBody.app.manifest).toBeDefined()
    const manifestPaths = Object.keys(getAppResponseBody.app.manifest)

    // Check that UI files are in manifest
    expect(manifestPaths.some((p) => p.includes('ui/index.html'))).toBe(true)
    expect(manifestPaths.some((p) => p.includes('ui/styles.css'))).toBe(true)

    // Check that worker files are in manifest
    expect(manifestPaths.some((p) => p.includes('workers/main.ts'))).toBe(true)

    // Verify UI bundle exists
    expect(getAppResponseBody.app.ui).toBeDefined()
    expect(getAppResponseBody.app.ui?.manifest).toBeDefined()
    expect(
      Object.keys(getAppResponseBody.app.ui?.manifest ?? {}).length,
    ).toBeGreaterThan(0)

    // Verify workers bundle exists
    expect(getAppResponseBody.app.runtimeWorkers).toBeDefined()
    expect(getAppResponseBody.app.runtimeWorkers.manifest).toBeDefined()
    expect(
      Object.keys(getAppResponseBody.app.runtimeWorkers.manifest).length,
    ).toBeGreaterThan(0)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
