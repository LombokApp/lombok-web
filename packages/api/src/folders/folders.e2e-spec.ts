import { getQueueToken } from '@nestjs/bullmq'
import {
  buildTestModule,
  registerTestUser,
  testS3Location,
} from 'src/core/utils/test.util'
import type { InMemoryQueue } from 'src/queue/InMemoryQueue'
import { QueueName } from 'src/queue/queue.constants'
import request from 'supertest'

const TEST_MODULE_KEY = 'folders'

describe('Folders', () => {
  let testModule: Awaited<ReturnType<typeof buildTestModule>> | undefined

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
    })
  })

  afterEach(async () => {
    await testModule?.resetDb()
  })

  it(`should get a folder by id`, async () => {
    const {
      session: { accessToken },
    } = await registerTestUser(testModule, {
      username: 'testuser',
      password: '123',
    })

    const folderCreateResponse = await request(testModule?.app.getHttpServer())
      .post(`/folders`)
      .auth(accessToken, { type: 'bearer' })
      .send({
        name: 'My Folder',
        contentLocation: {
          accessKeyId: 'sdfsdf',
          secretAccessKey: 'sdfsdf',
          endpoint: 'sdfsdf',
          bucket: 'sdfsdf',
          region: 'sdfsdf',
          prefix: 'sdfsdf',
        },
        metadataLocation: {
          accessKeyId: 'sdfsdf',
          secretAccessKey: 'sdfsdf',
          endpoint: 'sdfsdf',
          bucket: 'sdfsdf',
          region: 'sdfsdf',
          prefix: 'sdfsdf',
        },
      })

    expect(folderCreateResponse.statusCode).toEqual(201)

    const folderGetResponse = await request(testModule?.app.getHttpServer())
      .get(`/folders/${folderCreateResponse.body.folder.id}`)
      .auth(accessToken, { type: 'bearer' })
      .send()

    expect(folderGetResponse.statusCode).toEqual(200)
    expect(folderGetResponse.body.folder.id).toEqual(
      folderCreateResponse.body.folder.id,
    )
  })

  it(`should return 401 from get folder by id without token`, async () => {
    const {
      session: { accessToken },
    } = await registerTestUser(testModule, {
      username: 'testuser',
      password: '123',
    })

    const folderCreateResponse = await request(testModule?.app.getHttpServer())
      .post(`/folders`)
      .auth(accessToken, { type: 'bearer' })
      .send({
        name: 'My Folder',
        contentLocation: {
          accessKeyId: 'sdfsdf',
          secretAccessKey: 'sdfsdf',
          endpoint: 'sdfsdf',
          bucket: 'sdfsdf',
          region: 'sdfsdf',
          prefix: 'sdfsdf',
        },
        metadataLocation: {
          accessKeyId: 'sdfsdf',
          secretAccessKey: 'sdfsdf',
          endpoint: 'sdfsdf',
          bucket: 'sdfsdf',
          region: 'sdfsdf',
          prefix: 'sdfsdf',
        },
      })

    expect(folderCreateResponse.statusCode).toEqual(201)

    const folderGetResponse = await request(testModule?.app.getHttpServer())
      .get(`/folders/${folderCreateResponse.body.folder.id}`)
      // .auth(accessToken as string, { type: 'bearer' }) // this is intentionally omitted
      .send()

    expect(folderGetResponse.statusCode).toEqual(401)
  })

  it(`should return 404 from get folder by id with valid token of non-owner user`, async () => {
    const {
      session: { accessToken },
    } = await registerTestUser(testModule, {
      username: 'testuser',
      password: '123',
    })

    const {
      session: { accessToken: secondUserAccessToken },
    } = await registerTestUser(testModule, {
      username: 'testuser2',
      password: '123',
    })

    const folderCreateResponse = await request(testModule?.app.getHttpServer())
      .post(`/folders`)
      .auth(accessToken, { type: 'bearer' })
      .send({
        name: 'My Folder',
        contentLocation: {
          accessKeyId: 'sdfsdf',
          secretAccessKey: 'sdfsdf',
          endpoint: 'sdfsdf',
          bucket: 'sdfsdf',
          region: 'sdfsdf',
          prefix: 'sdfsdf',
        },
        metadataLocation: {
          accessKeyId: 'sdfsdf',
          secretAccessKey: 'sdfsdf',
          endpoint: 'sdfsdf',
          bucket: 'sdfsdf',
          region: 'sdfsdf',
          prefix: 'sdfsdf',
        },
      })

    expect(folderCreateResponse.statusCode).toEqual(201)

    const folderGetResponse = await request(testModule?.app.getHttpServer())
      .get(`/folders/${folderCreateResponse.body.folder.id}`)
      .auth(secondUserAccessToken, { type: 'bearer' })
      .send()

    expect(folderGetResponse.statusCode).toEqual(404)
  })

  it(`it should scan the storage location represented by a folder`, async () => {
    const {
      session: { accessToken },
    } = await registerTestUser(testModule, {
      username: 'testuser',
      password: '123',
    })

    const MOCK_OBJECTS: { key: string; content: string }[] = [
      { content: 'object 1 content', key: 'key1' },
      { content: 'object 2 content', key: 'key2' },
    ]

    const bucketName =
      (await testModule?.initMinioTestBucket(MOCK_OBJECTS)) ?? ''
    const metadataBucketName = (await testModule?.initMinioTestBucket()) ?? ''
    const folderCreateBody = {
      name: 'My Folder',
      contentLocation: testS3Location({ bucketName }),
      metadataLocation: testS3Location({ bucketName: metadataBucketName }),
    }

    const folderCreateResponse = await request(testModule?.app.getHttpServer())
      .post(`/folders`)
      .auth(accessToken, { type: 'bearer' })
      .send(folderCreateBody)

    expect(folderCreateResponse.statusCode).toEqual(201)

    const folderGetResponse = await request(testModule?.app.getHttpServer())
      .get(`/folders/${folderCreateResponse.body.folder.id}`)
      .auth(accessToken, { type: 'bearer' })
      .send()

    expect(folderGetResponse.statusCode).toEqual(200)
    expect(folderGetResponse.body.folder.id).toEqual(
      folderCreateResponse.body.folder.id,
    )

    const _folderRescanResponse = await request(testModule?.app.getHttpServer())
      .post(`/folders/${folderCreateResponse.body.folder.id}/rescan`)
      .auth(accessToken, { type: 'bearer' })
      .send()

    await new Promise((resolve) => setTimeout(resolve, 1000))

    const queue: InMemoryQueue | undefined = await testModule?.app.resolve(
      getQueueToken(QueueName.RescanFolder),
    )

    // console.log('queue:', queue)
    console.log('queue:', { stats: queue?.stats, queueId: queue?.queueId })

    const listObjectsResponse = await request(testModule?.app.getHttpServer())
      .get(`/folders/${folderCreateResponse.body.folder.id}/objects`)
      .auth(accessToken, { type: 'bearer' })
      .send()

    expect(listObjectsResponse.body.result.length).toBeGreaterThan(0)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
