import { getQueueToken } from '@nestjs/bullmq'
import {
  buildTestModule,
  registerTestUser,
  testS3Location,
  waitForTrue,
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
        contentLocation: testS3Location({ bucketName: '__dummy__' }),
        metadataLocation: testS3Location({ bucketName: '__dummy__' }),
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

  it(`should list a user's folders`, async () => {
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
        contentLocation: testS3Location({ bucketName: '__dummy__' }),
        metadataLocation: testS3Location({ bucketName: '__dummy__' }),
      })

    expect(folderCreateResponse.statusCode).toEqual(201)

    const folderListResponse = await request(testModule?.app.getHttpServer())
      .get('/folders')
      .auth(accessToken, { type: 'bearer' })
      .send()

    expect(folderListResponse.statusCode).toEqual(200)
    expect(folderListResponse.body.meta.totalCount).toEqual(1)
    expect(folderListResponse.body.result.length).toEqual(1)
  })

  it(`should delete a folder by id`, async () => {
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
        contentLocation: testS3Location({ bucketName: '__dummy__' }),
        metadataLocation: testS3Location({ bucketName: '__other_dummy__' }),
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

    const deleteFolderGetResponse = await request(
      testModule?.app.getHttpServer(),
    )
      .delete(`/folders/${folderCreateResponse.body.folder.id}`)
      .auth(accessToken, { type: 'bearer' })
      .send()

    expect(deleteFolderGetResponse.statusCode).toEqual(200)

    const secondFolderGetResponse = await request(
      testModule?.app.getHttpServer(),
    )
      .get(`/folders/${folderCreateResponse.body.folder.id}`)
      .auth(accessToken, { type: 'bearer' })
      .send()

    expect(secondFolderGetResponse.statusCode).toEqual(404)
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
        contentLocation: testS3Location({ bucketName: '__dummy__' }),
        metadataLocation: testS3Location({ bucketName: '__dummy__' }),
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
        contentLocation: testS3Location({ bucketName: '__dummy__' }),
        metadataLocation: testS3Location({ bucketName: '__dummy__' }),
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

    const queue: InMemoryQueue | undefined = await testModule?.app.resolve(
      getQueueToken(QueueName.RescanFolder),
    )
    const jobsCompletedBefore = queue?.stats.completedJobs ?? 0

    const _folderRescanResponse = await request(testModule?.app.getHttpServer())
      .post(`/folders/${folderCreateResponse.body.folder.id}/rescan`)
      .auth(accessToken, { type: 'bearer' })
      .send()

    // wait to see that a job was run (we know it's our job)
    await waitForTrue(
      () => (queue?.stats.completedJobs ?? 0) > jobsCompletedBefore,
      { retryPeriod: 100, maxRetries: 1 },
    )
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
