import { buildTestModule, registerTestUser } from 'src/core/utils/test.util'
import request from 'supertest'

const TEST_DB_NAME = 'folders'

describe('Folders', () => {
  let testModule: Awaited<ReturnType<typeof buildTestModule>> | undefined

  beforeAll(async () => {
    testModule = await buildTestModule(TEST_DB_NAME)
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

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
