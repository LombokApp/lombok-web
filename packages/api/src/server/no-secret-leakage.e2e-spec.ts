import { StorageProvisionTypeEnum } from '@lombokapp/types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
} from 'src/test/test.util'

const TEST_MODULE_KEY = 'no_secret_leak'

describe('No Secret Leakage', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
      debug: true,
    })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetAppState()
    testModule?.cleanupMinioTestBuckets()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  describe('Server Storage', () => {
    it('should not return secretAccessKey from GET /server/server-storage', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'ssget',
        password: '123',
        admin: true,
      })

      await testModule!.setServerStorageLocation()

      const res = await apiClient(accessToken).GET(
        '/api/v1/server/server-storage',
      )
      expect(res.response.status).toBe(200)
      expect(res.data?.serverStorageLocation).toBeDefined()
      expect(
        (res.data?.serverStorageLocation as Record<string, unknown>)
          .secretAccessKey,
      ).toBeNull()
    })

    it('should not return secretAccessKey from POST /server/server-storage', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'sspost',
        password: '123',
        admin: true,
      })

      const s3Config = testModule!.testS3ClientConfig()
      const bucketName = await testModule!.initMinioTestBucket()

      const res = await apiClient(accessToken).POST(
        '/api/v1/server/server-storage',
        {
          body: {
            accessKeyId: s3Config.accessKeyId,
            secretAccessKey: s3Config.secretAccessKey,
            endpoint: s3Config.endpoint,
            bucket: bucketName,
            region: s3Config.region,
            prefix: null,
          },
        },
      )
      expect([200, 201]).toContain(res.response.status)
      expect(res.data?.serverStorageLocation).toBeDefined()
      expect(
        (res.data?.serverStorageLocation as Record<string, unknown>)
          .secretAccessKey,
      ).toBeNull()
    })
  })

  describe('User Access Keys', () => {
    it('should not return secretAccessKey from GET /access-keys', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'akuser',
        password: '123',
      })

      await createTestFolder({
        folderName: 'My Folder',
        testModule,
        accessToken,
        mockFiles: [],
        apiClient,
      })

      const res = await apiClient(accessToken).GET('/api/v1/access-keys')
      expect(res.response.status).toEqual(200)
      expect(res.data!.result.length).toBeGreaterThanOrEqual(1)

      for (const accessKey of res.data!.result) {
        expect(
          (accessKey as Record<string, unknown>).secretAccessKey,
        ).toBeNull()
        expect(accessKey.accessKeyId).toBeDefined()
        expect(accessKey.accessKeyHashId).toBeDefined()
      }
    })
  })

  describe('Server Access Keys', () => {
    it('should not return secretAccessKey from GET /server/access-keys', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'sakuser',
        password: '123',
        admin: true,
      })

      const s3Config = testModule!.testS3ClientConfig()
      const provisionBucketName = await testModule!.initMinioTestBucket()

      const createProvisionRes = await apiClient(accessToken).POST(
        '/api/v1/server/storage-provisions',
        {
          body: {
            accessKeyId: s3Config.accessKeyId,
            secretAccessKey: s3Config.secretAccessKey,
            endpoint: s3Config.endpoint,
            bucket: provisionBucketName,
            region: s3Config.region,
            prefix: null,
            label: 'testlabel',
            description: 'Test',
            provisionTypes: ['CONTENT'],
          },
        },
      )
      const storageProvisionId = createProvisionRes.data!.result[0]!.id

      // Create folder using the provision so it creates SERVER-type storage locations
      await apiClient(accessToken).POST('/api/v1/folders', {
        body: {
          name: 'Test Folder',
          contentLocation: { storageProvisionId },
          metadataLocation: { storageProvisionId },
        },
      })

      const res = await apiClient(accessToken).GET('/api/v1/server/access-keys')
      expect(res.response.status).toEqual(200)
      expect(res.data!.result.length).toBeGreaterThanOrEqual(1)

      for (const accessKey of res.data!.result) {
        expect(
          (accessKey as Record<string, unknown>).secretAccessKey,
        ).toBeNull()
        expect(accessKey.accessKeyId).toBeDefined()
        expect(accessKey.accessKeyHashId).toBeDefined()
      }
    })
  })

  describe('Storage Provisions', () => {
    const createStorageProvision = async (accessToken: string) => {
      const s3Config = testModule!.testS3ClientConfig()
      const bucketName = await testModule!.initMinioTestBucket()

      return apiClient(accessToken).POST('/api/v1/server/storage-provisions', {
        body: {
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey,
          endpoint: s3Config.endpoint,
          bucket: bucketName,
          region: s3Config.region,
          prefix: null,
          label: 'testlabel',
          description: 'Test provision',
          provisionTypes: [StorageProvisionTypeEnum.CONTENT],
        },
      })
    }

    it('should not return secretAccessKey from POST /storage-provisions', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'spcreate',
        password: '123',
        admin: true,
      })

      const res = await createStorageProvision(accessToken)
      expect(res.response.status).toEqual(201)

      for (const provision of res.data!.result) {
        expect(
          (provision as Record<string, unknown>).secretAccessKey,
        ).toBeNull()
      }
    })

    it('should not return secretAccessKey from GET /storage-provisions', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'splist',
        password: '123',
        admin: true,
      })

      await createStorageProvision(accessToken)

      const res = await apiClient(accessToken).GET(
        '/api/v1/server/storage-provisions',
      )
      expect(res.response.status).toEqual(200)

      for (const provision of res.data!.result) {
        expect(
          (provision as Record<string, unknown>).secretAccessKey,
        ).toBeNull()
      }
    })

    it('should not return secretAccessKey from GET /storage-provisions/:id', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'spget',
        password: '123',
        admin: true,
      })

      const createRes = await createStorageProvision(accessToken)
      const provisionId = createRes.data!.result[0]!.id

      const res = await apiClient(accessToken).GET(
        '/api/v1/server/storage-provisions/{storageProvisionId}',
        { params: { path: { storageProvisionId: provisionId } } },
      )
      expect(res.response.status).toEqual(200)
      expect(
        (res.data!.storageProvision as Record<string, unknown>).secretAccessKey,
      ).toBeNull()
    })

    it('should not return secretAccessKey from DELETE /storage-provisions/:id', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'spdelete',
        password: '123',
        admin: true,
      })

      const createRes = await createStorageProvision(accessToken)
      const provisionId = createRes.data!.result[0]!.id

      const res = await apiClient(accessToken).DELETE(
        '/api/v1/server/storage-provisions/{storageProvisionId}',
        { params: { path: { storageProvisionId: provisionId } } },
      )
      expect(res.response.status).toEqual(200)

      for (const provision of res.data!.result) {
        expect(
          (provision as Record<string, unknown>).secretAccessKey,
        ).toBeNull()
      }
    })
  })

  describe('Server Settings', () => {
    it('should not return secretAccessKey in SERVER_STORAGE from GET /settings', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'setss',
        password: '123',
        admin: true,
      })

      await testModule!.setServerStorageLocation()

      const res = await apiClient(accessToken).GET('/api/v1/server/settings')
      expect(res.response.status).toEqual(200)

      const serverStorage = res.data?.settings.SERVER_STORAGE as
        | Record<string, unknown>
        | undefined
      expect(serverStorage).toBeDefined()
      expect(serverStorage?.secretAccessKey).toBeNull()
      expect(serverStorage?.accessKeyId).toBeDefined()
    })

    it('should not return secretAccessKey in STORAGE_PROVISIONS from GET /settings', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'setsp',
        password: '123',
        admin: true,
      })

      const s3Config = testModule!.testS3ClientConfig()
      const bucketName = await testModule!.initMinioTestBucket()

      await apiClient(accessToken).POST('/api/v1/server/storage-provisions', {
        body: {
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey,
          endpoint: s3Config.endpoint,
          bucket: bucketName,
          region: s3Config.region,
          prefix: null,
          label: 'testlabel',
          description: 'Test',
          provisionTypes: [StorageProvisionTypeEnum.CONTENT],
        },
      })

      const res = await apiClient(accessToken).GET('/api/v1/server/settings')
      expect(res.response.status).toEqual(200)

      const provisions = res.data?.settings.STORAGE_PROVISIONS as
        | Record<string, unknown>[]
        | undefined
      expect(provisions).toBeDefined()
      expect(provisions!.length).toBeGreaterThanOrEqual(1)

      for (const provision of provisions!) {
        expect(provision.secretAccessKey).toBeNull()
      }
    })

    it('should not return clientSecret in GOOGLE_OAUTH_CONFIG from GET /settings', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'setgoogle',
        password: '123',
        admin: true,
      })

      await apiClient(accessToken).PUT('/api/v1/server/settings/{settingKey}', {
        params: { path: { settingKey: 'GOOGLE_OAUTH_CONFIG' } },
        body: {
          value: {
            enabled: true,
            clientId: 'test-client-id',
            clientSecret: 'super-secret-value',
          },
        },
      })

      const res = await apiClient(accessToken).GET('/api/v1/server/settings')
      expect(res.response.status).toEqual(200)

      const googleConfig = res.data?.settings.GOOGLE_OAUTH_CONFIG as
        | Record<string, unknown>
        | undefined
      expect(googleConfig).toBeDefined()
      expect(googleConfig?.clientId).toEqual('test-client-id')
      expect(googleConfig?.enabled).toEqual(true)
      expect(googleConfig?.clientSecret).toBeNull()
    })

    it('should not return apiKey in EMAIL_PROVIDER_CONFIG (Resend) from GET /settings', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'setemailr',
        password: '123',
        admin: true,
      })

      await apiClient(accessToken).PUT('/api/v1/server/settings/{settingKey}', {
        params: { path: { settingKey: 'EMAIL_PROVIDER_CONFIG' } },
        body: {
          value: {
            provider: 'resend',
            from: 'test@example.com',
            config: { apiKey: 're_secret_key' },
          },
        },
      })

      const res = await apiClient(accessToken).GET('/api/v1/server/settings')
      expect(res.response.status).toEqual(200)

      const emailConfig = res.data?.settings.EMAIL_PROVIDER_CONFIG as
        | Record<string, unknown>
        | undefined
      expect(emailConfig).toBeDefined()
      expect(emailConfig?.provider).toEqual('resend')

      const config = emailConfig?.config as Record<string, unknown>
      expect(config.apiKey).toBeNull()
    })

    it('should not return password in EMAIL_PROVIDER_CONFIG (SMTP) from GET /settings', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'setemails',
        password: '123',
        admin: true,
      })

      await apiClient(accessToken).PUT('/api/v1/server/settings/{settingKey}', {
        params: { path: { settingKey: 'EMAIL_PROVIDER_CONFIG' } },
        body: {
          value: {
            provider: 'smtp',
            from: 'test@example.com',
            config: {
              host: 'smtp.example.com',
              port: 587,
              username: 'user',
              password: 'super-secret',
            },
          },
        },
      })

      const res = await apiClient(accessToken).GET('/api/v1/server/settings')
      expect(res.response.status).toEqual(200)

      const emailConfig = res.data?.settings.EMAIL_PROVIDER_CONFIG as
        | Record<string, unknown>
        | undefined
      expect(emailConfig).toBeDefined()
      expect(emailConfig?.provider).toEqual('smtp')

      const config = emailConfig?.config as Record<string, unknown>
      expect(config.host).toEqual('smtp.example.com')
      expect(config.username).toEqual('user')
      expect(config.password).toBeNull()
    })
  })
})
