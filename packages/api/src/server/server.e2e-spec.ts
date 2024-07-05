import { buildTestModule, registerTestUser } from 'src/core/utils/test.util'
import request from 'supertest'

const TEST_MODULE_KEY = 'server'

describe('Server', () => {
  let testModule: Awaited<ReturnType<typeof buildTestModule>> | undefined

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
  })

  afterEach(async () => {
    await testModule?.resetDb()
  })

  it(`should get a folder by id`, async () => {
    const {
      session: { accessToken },
    } = await registerTestUser(testModule, {
      username: 'mekpans',
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

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
