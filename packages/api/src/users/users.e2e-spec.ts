import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'

const TEST_MODULE_KEY = 'users'

const TEST_USER_INPUT = {
  isAdmin: false,
  password: 'testpass',
  username: 'testusername',
  email: 'test@email.com',
  name: 'testname',
  emailVerified: true,
  permissions: [],
}

describe('Users', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetDb()
  })

  it(`should create a user`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const newUserResponse = await apiClient
      .usersApi({ accessToken })
      .createUser({
        userCreateInputDTO: TEST_USER_INPUT,
      })

    expect(newUserResponse.status).toEqual(201)
  })

  it(`should update a user`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'mekpans',
      name: 'initialname',
      email: 'me@test.com',
      password: '123',
      admin: true,
    })
    const viewer = await apiClient.viewerApi({ accessToken }).getViewer()

    expect(viewer.data.user.email).toEqual('me@test.com')
    expect(viewer.data.user.name).toEqual('initialname')

    const newUserResponse = await apiClient
      .usersApi({ accessToken })
      .createUser({
        userCreateInputDTO: TEST_USER_INPUT,
      })
    expect(newUserResponse.status).toEqual(201)

    const updatedUserResponse = await apiClient
      .usersApi({ accessToken })
      .updateUser({
        userId: newUserResponse.data.user.id,
        userUpdateInputDTO: {
          name: 'updatedname',
          username: 'updatedusername',
          password: 'updatedpassword',
          isAdmin: true,
        },
      })
    expect(updatedUserResponse.data.user.name).toEqual('updatedname')
    expect(updatedUserResponse.data.user.username).toEqual('updatedusername')
    expect(updatedUserResponse.data.user.isAdmin).toEqual(true)
    expect(
      updatedUserResponse.data.user.createdAt ===
        updatedUserResponse.data.user.updatedAt,
    ).toBe(false)

    expect(updatedUserResponse.status).toEqual(200)

    const removeEmailUpdateUserResponse = await apiClient
      .usersApi({ accessToken })
      .updateUser({
        userId: newUserResponse.data.user.id,
        userUpdateInputDTO: {
          email: null,
        },
      })

    expect(removeEmailUpdateUserResponse.status).toEqual(200)
    expect(removeEmailUpdateUserResponse.data.user.email).toBeFalsy()

    const removeNameUpdateUserResponse = await apiClient
      .usersApi({ accessToken })
      .updateUser({
        userId: newUserResponse.data.user.id,
        userUpdateInputDTO: {
          name: null,
        },
      })

    expect(removeNameUpdateUserResponse.status).toEqual(200)
    expect(removeNameUpdateUserResponse.data.user.name).toBeFalsy()
  })

  it(`should get a user by id`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const newUserResponse = await apiClient
      .usersApi({ accessToken })
      .createUser({
        userCreateInputDTO: TEST_USER_INPUT,
      })
    expect(newUserResponse.status).toEqual(201)

    const fetchedUserResponse = await apiClient
      .usersApi({ accessToken })
      .getUser({
        userId: newUserResponse.data.user.id,
      })
    expect(newUserResponse.status).toEqual(201)

    expect(fetchedUserResponse.data.user.email).toEqual(TEST_USER_INPUT.email)
    expect(fetchedUserResponse.data.user.emailVerified).toEqual(
      TEST_USER_INPUT.emailVerified,
    )
    expect(fetchedUserResponse.data.user.isAdmin).toEqual(
      TEST_USER_INPUT.isAdmin,
    )
    expect(fetchedUserResponse.data.user.name).toEqual(TEST_USER_INPUT.name)
    expect(fetchedUserResponse.data.user.username).toEqual(
      TEST_USER_INPUT.username,
    )
  })

  it(`should list users`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const listUsersResponse = await apiClient
      .usersApi({ accessToken })
      .listUsers()

    expect(listUsersResponse.status).toEqual(200)
    expect(listUsersResponse.data.result.length).toEqual(1)
    expect(listUsersResponse.data.result.length).toEqual(
      listUsersResponse.data.meta.totalCount,
    )
  })

  it(`should delete a user by id`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const newUserResponse = await apiClient
      .usersApi({ accessToken })
      .createUser({
        userCreateInputDTO: TEST_USER_INPUT,
      })
    expect(newUserResponse.status).toEqual(201)

    const deletedUserResponse = await apiClient
      .usersApi({ accessToken })
      .deleteUser({
        userId: newUserResponse.data.user.id,
      })

    expect(deletedUserResponse.status).toEqual(200)

    const fetchedUserResponse = await apiClient
      .usersApi({ accessToken })
      .getUser({
        userId: newUserResponse.data.user.id,
      })
    expect(fetchedUserResponse.status).toEqual(404)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
