import { Test } from '@nestjs/testing'
import { SignedURLsRequestMethod } from '@stellariscloud/types'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import type { LoginResponse } from 'src/auth/dto/responses/login-response.dto'
import { RedisService } from 'src/cache/redis.service'
import { CoreTestModule } from 'src/core/core-test.module'
import { OrmService, TEST_DB_PREFIX } from 'src/orm/orm.service'
import { configureS3Client } from 'src/s3/s3.service'
import { createS3PresignedUrls } from 'src/s3/s3.utils'
import request from 'supertest'

import { ormConfig } from '../../orm/config'
import { setApp, setAppInitializing } from '../app-helper'

const MINIO_LOCAL_PATH = '/minio-test-data'
const MINIO_ACCESS_KEY_ID = 'testaccesskeyid'
const MINIO_SECRET_ACCESS_KEY = 'testsecretaccesskey'
const MINIO_ENDPOINT = 'http://miniotest:9000'
const MINIO_REGION = 'auto'

export async function buildTestModule({
  testModuleKey,
}: {
  testModuleKey: string
}) {
  const dbName = `test_db_${testModuleKey}`
  const bucketPathsToRemove: string[] = []
  const redisService = {
    getAll: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    markAsInActive: jest.fn(),
  }

  const appPromise = Test.createTestingModule({
    imports: [CoreTestModule],
    providers: [],
  })
    .overrideProvider(ormConfig.KEY)
    .useValue({ ...ormConfig(), dbName: `${TEST_DB_PREFIX}${dbName}` })
    .overrideProvider(RedisService)
    .useValue(redisService)
    .compile()
    .then((moduleRef) => moduleRef.createNestApplication())

  setAppInitializing(appPromise)

  const app = await appPromise
  setApp(app)

  const ormService = await app.resolve(OrmService)

  // truncate the db before running first init (which will migrate the db)
  await ormService.truncateTestDatabase()

  await app.enableShutdownHooks().init()

  return {
    app,
    shutdown: async () => {
      // remove created minio buckets
      for (const p of bucketPathsToRemove) {
        fs.rmSync(p, { recursive: true })
      }

      // shutdown the app
      await app.close()
    },
    resetDb: () => ormService.resetTestDb(),
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
    initMinioTestBucket: async (
      createFiles: { key: string; content: Buffer | string }[] = [],
    ) => {
      const bucketName = `test-bucket-${(Math.random() + 1).toString(36).substring(7)}`
      const bucketPath = path.join(MINIO_LOCAL_PATH, bucketName)
      bucketPathsToRemove.push(bucketPath)

      if (fs.existsSync(bucketPath)) {
        throw new Error('Test bucket somehow already exists.')
      }

      fs.mkdirSync(bucketPath)

      const uploadUrls = createS3PresignedUrls(
        createFiles.map(({ key }) => {
          return {
            accessKeyId: MINIO_ACCESS_KEY_ID,
            secretAccessKey: MINIO_SECRET_ACCESS_KEY,
            endpoint: MINIO_ENDPOINT,
            region: MINIO_REGION,
            bucket: bucketName,
            expirySeconds: 3000,
            method: SignedURLsRequestMethod.PUT,
            objectKey: key,
          }
        }),
      )

      await Promise.all(
        uploadUrls.map((uploadUrl, i) =>
          axios.put(uploadUrl, createFiles[i].content),
        ),
      )
      return bucketName
    },
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

type TestModule = Awaited<ReturnType<typeof buildTestModule>> | undefined

export async function registerTestUser(
  testModule: TestModule,
  input: {
    username: string
    email?: string
    password: string
  },
): Promise<LoginResponse> {
  const server = testModule?.app.getHttpServer()
  const req = request(server)
  await req.post('/auth/signup').send(input).expect(201)
  const result = await req
    .post('/auth/login')
    .send({ login: input.email ?? input.username, password: input.password })
  return result.body
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

export async function waitForTrue(
  condition: () => boolean,
  { retryPeriod, maxRetries }: { retryPeriod: number; maxRetries: number },
) {
  await new Promise<void>((resolve, reject) => {
    let checkCount = 0
    const interval = setInterval(() => {
      if (checkCount >= maxRetries) {
        clearInterval(interval)
        reject(new Error('Timeout waiting for condition to return true.'))
      } else if (condition()) {
        clearInterval(interval)
        resolve()
      }
      checkCount += 1
    }, retryPeriod)
  })
}
