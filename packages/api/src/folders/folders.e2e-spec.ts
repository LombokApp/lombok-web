import { buildTestModule } from 'src/core/utils/test.util'
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
    await request(testModule?.app.getHttpServer())
      .post('/auth/signup')
      .send({
        username: 'mekpans',
        password: '123',
      })
      .expect(201)

    const {
      body: {
        session: { accessToken },
      },
    } = await request(testModule?.app.getHttpServer())
      .post('/auth/login')
      .send({
        login: 'mekpans',
        password: '123',
      })

    const folderCreateResponse = await request(testModule?.app.getHttpServer())
      .post(`/folders`)
      .auth(accessToken as string, { type: 'bearer' })
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
      .auth(accessToken as string, { type: 'bearer' })
      .send()

    expect(folderGetResponse.statusCode).toEqual(200)
    expect(folderGetResponse.body.folder.id).toEqual(
      folderCreateResponse.body.folder.id,
    )
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
