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

const TEST_MODULE_KEY = 'folder_objects'

describe('Folder Objects', () => {
  let testModule: Awaited<ReturnType<typeof buildTestModule>> | undefined

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
    })
  })

  afterEach(async () => {
    await testModule?.resetDb()
  })

  it(`should get a folder object by folderId and key`, async () => {
    const {
      session: { accessToken },
    } = await registerTestUser(testModule, {
      username: 'testuser',
      password: '123',
    })

    const MOCK_OBJECTS: { key: string; content: string }[] = [
      { content: 'object 1 content', key: 'key1' },
      { content: 'object 2 content', key: 'key2' },
      { content: 'object 3 content', key: 'key3' },
      { content: 'object 4 content', key: 'key4' },
      { content: 'object 5 content', key: 'key5' },
    ]

    const bucketName =
      (await testModule?.initMinioTestBucket(MOCK_OBJECTS)) ?? ''
    const metadataBucketName = (await testModule?.initMinioTestBucket()) ?? ''

    const folderCreateResponse = await request(testModule?.app.getHttpServer())
      .post(`/folders`)
      .auth(accessToken, { type: 'bearer' })
      .send({
        name: 'My Folder',
        contentLocation: testS3Location({ bucketName }),
        metadataLocation: testS3Location({ bucketName: metadataBucketName }),
      })
    // console.log('folderCreateResponse.body:', folderCreateResponse.body)

    expect(folderCreateResponse.statusCode).toEqual(201)
    const queue: InMemoryQueue | undefined = await testModule?.app.resolve(
      getQueueToken(QueueName.RescanFolder),
    )

    const jobsCompletedBefore = queue?.stats.completedJobs ?? 0

    await request(testModule?.app.getHttpServer())
      .post(`/folders/${folderCreateResponse.body.folder.id}/rescan`)
      .auth(accessToken, { type: 'bearer' })
      .send()

    await waitForTrue(
      () => (queue?.stats.completedJobs ?? 0) > jobsCompletedBefore,
      { retryPeriod: 100, maxRetries: 1 },
    )

    const folderObjectGetResponse = await request(
      testModule?.app.getHttpServer(),
    )
      .get(`/folders/${folderCreateResponse.body.folder.id}/objects/key3`)
      .auth(accessToken, { type: 'bearer' })
      .send()

    // console.log('folderObjectGetResponse.body:', folderObjectGetResponse.body)
    expect(folderObjectGetResponse.statusCode).toEqual(200)
    expect(folderObjectGetResponse.body.folderObject.objectKey).toEqual('key3')
    expect(folderObjectGetResponse.body.folderObject.sizeBytes).toEqual(16)
  })

  it(`it should list objects in a folder`, async () => {
    const {
      session: { accessToken },
    } = await registerTestUser(testModule, {
      username: 'testuser',
      password: '123',
    })

    const MOCK_OBJECTS: { key: string; content: string }[] = [
      { content: 'object 1 content', key: 'key1' },
      { content: 'object 2 content', key: 'key2' },
      { content: 'object 3 content', key: 'key3' },
      { content: 'object 4 content', key: 'key4' },
      { content: 'object 5 content', key: 'key5' },
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

    await request(testModule?.app.getHttpServer())
      .post(`/folders/${folderCreateResponse.body.folder.id}/rescan`)
      .auth(accessToken, { type: 'bearer' })
      .send()

    await waitForTrue(
      () => (queue?.stats.completedJobs ?? 0) > jobsCompletedBefore,
      { retryPeriod: 100, maxRetries: 1 },
    )

    const listObjectsResponse = await request(testModule?.app.getHttpServer())
      .get(`/folders/${folderCreateResponse.body.folder.id}/objects`)
      .auth(accessToken, { type: 'bearer' })
      .send()

    expect(listObjectsResponse.body.result.length).toBe(5)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
