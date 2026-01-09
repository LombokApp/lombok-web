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
import crypto from 'crypto'
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

/**
 * Generates a public key for testing
 */
function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair(
      'rsa',
      {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      },
      (err, publicKey, privateKey) => {
        if (err) {
          reject(err)
        } else {
          resolve({ publicKey, privateKey })
        }
      },
    )
  })
}

describe('Apps Installation via Zip', () => {
  let testModule: TestModule | undefined

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
      // debug: true,
    })
  })

  beforeEach(async () => {
    await testModule?.setServerStorageLocation()
  })

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
    expect(responseBody.app.identifier).toBeDefined()

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

      // Write .publicKey but no config.json
      const { publicKey } = await generateKeyPair()
      await fs.promises.writeFile(path.join(appDir, '.publicKey'), publicKey)

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

  it('should update an existing app when installing the same app again', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'admin5',
      password: '123',
      admin: true,
    })

    const appSlug = `testappupdate${Date.now()}`
    const appLabel = 'Test App for Update'

    // Install the app first time
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

    // Install the same app again (should update)
    const response2 = await request(testModule!.app.getHttpServer() as App)
      .post('/api/v1/server/apps/install')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', zipBuffer, 'test-app.zip')

    const response1Body = response1.body as AppInstallResponse
    const response2Body = response2.body as AppInstallResponse

    expect(response2.status).toBe(201)
    expect({
      ...response1Body.app,
      installId: undefined,
      updatedAt: undefined,
    }).toEqual({
      ...response2Body.app,
      installId: undefined,
      updatedAt: undefined,
    })
    expect(response1Body.app.updatedAt).toBeDefined()
    expect(response2Body.app.updatedAt).toBeDefined()

    expect(new Date(response2Body.app.updatedAt).getTime()).toBeGreaterThan(
      new Date(response1Body.app.updatedAt).getTime(),
    )
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
