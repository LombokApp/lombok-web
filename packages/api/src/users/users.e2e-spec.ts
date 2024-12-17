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
    await testModule?.resetAppState()
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

  it(`should fail to create a user on duplicate username`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'user1',
      password: '123',
      admin: true,
    })

    const newUserResponse = await apiClient
      .usersApi({ accessToken })
      .createUser({
        userCreateInputDTO: { ...TEST_USER_INPUT, username: 'user1' },
      })

    expect(newUserResponse.status).toEqual(409)
  })

  it(`should update a user's email only`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'initialusername',
      name: 'initialname',
      password: '123',
      admin: true,
    })

    const newUserResponse = await apiClient
      .usersApi({ accessToken })
      .createUser({
        userCreateInputDTO: {
          isAdmin: false,
          password: 'testpass',
          username: 'testusername',
          // email: 'email@example.com',
          name: 'testname',
          emailVerified: true,
          permissions: [],
        },
      })
    expect(newUserResponse.status).toEqual(201)

    expect(newUserResponse.data.user.name).toEqual('testname')
    expect(newUserResponse.data.user.username).toEqual('testusername')
    expect(newUserResponse.data.user.email).toEqual(null)
    expect(newUserResponse.data.user.isAdmin).toEqual(false)
    expect(
      newUserResponse.data.user.createdAt ===
        newUserResponse.data.user.updatedAt,
    ).toBe(true)

    const setEmailUpdateUserResponse = await apiClient
      .usersApi({ accessToken })
      .updateUser({
        userId: newUserResponse.data.user.id,
        userUpdateInputDTO: {
          email: 'email@example.com',
        },
      })

    expect(setEmailUpdateUserResponse.status).toEqual(200)
    expect(setEmailUpdateUserResponse.data.user.name).toEqual('testname')
    expect(setEmailUpdateUserResponse.data.user.username).toEqual(
      'testusername',
    )
    expect(setEmailUpdateUserResponse.data.user.email).toBe('email@example.com')
    expect(setEmailUpdateUserResponse.data.user.isAdmin).toEqual(false)
    expect(
      setEmailUpdateUserResponse.data.user.createdAt ===
        setEmailUpdateUserResponse.data.user.updatedAt,
    ).toBe(false)
  })

  it(`should update a user's name only`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'adminusername',
      name: 'adminname',
      password: '123',
      admin: true,
    })

    const newUserResponse = await apiClient
      .usersApi({ accessToken })
      .createUser({
        userCreateInputDTO: {
          isAdmin: false,
          password: 'testpass',
          username: 'initialusername',
          email: 'email@example.com',
          // name: 'initialname',
          emailVerified: true,
          permissions: [],
        },
      })
    expect(newUserResponse.status).toEqual(201)

    expect(newUserResponse.data.user.name).toEqual(null)
    expect(newUserResponse.data.user.username).toEqual('initialusername')
    expect(newUserResponse.data.user.email).toEqual('email@example.com')
    expect(newUserResponse.data.user.isAdmin).toEqual(false)
    expect(
      newUserResponse.data.user.createdAt ===
        newUserResponse.data.user.updatedAt,
    ).toBe(true)

    const setNameUpdateUserResponse = await apiClient
      .usersApi({ accessToken })
      .updateUser({
        userId: newUserResponse.data.user.id,
        userUpdateInputDTO: {
          name: 'newname',
        },
      })

    expect(setNameUpdateUserResponse.status).toEqual(200)
    expect(setNameUpdateUserResponse.data.user.name).toEqual('newname')
    expect(setNameUpdateUserResponse.data.user.username).toEqual(
      'initialusername',
    )
    expect(setNameUpdateUserResponse.data.user.email).toBe('email@example.com')
    expect(setNameUpdateUserResponse.data.user.isAdmin).toEqual(false)
    expect(
      setNameUpdateUserResponse.data.user.createdAt ===
        setNameUpdateUserResponse.data.user.updatedAt,
    ).toBe(false)
  })

  it(`should update a user's isAdmin flag only`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'adminusername',
      name: 'adminname',
      password: '123',
      admin: true,
    })

    const newUserResponse = await apiClient
      .usersApi({ accessToken })
      .createUser({
        userCreateInputDTO: {
          isAdmin: false,
          password: 'testpass',
          username: 'initialusername',
          email: 'email@example.com',
          name: 'initialname',
          emailVerified: true,
          permissions: [],
        },
      })
    expect(newUserResponse.status).toEqual(201)

    expect(newUserResponse.data.user.name).toEqual('initialname')
    expect(newUserResponse.data.user.username).toEqual('initialusername')
    expect(newUserResponse.data.user.email).toEqual('email@example.com')
    expect(newUserResponse.data.user.isAdmin).toEqual(false)
    expect(
      newUserResponse.data.user.createdAt ===
        newUserResponse.data.user.updatedAt,
    ).toBe(true)

    const setNameUpdateUserResponse = await apiClient
      .usersApi({ accessToken })
      .updateUser({
        userId: newUserResponse.data.user.id,
        userUpdateInputDTO: {
          isAdmin: true,
        },
      })

    expect(setNameUpdateUserResponse.status).toEqual(200)
    expect(setNameUpdateUserResponse.data.user.name).toEqual('initialname')
    expect(setNameUpdateUserResponse.data.user.username).toEqual(
      'initialusername',
    )
    expect(setNameUpdateUserResponse.data.user.email).toBe('email@example.com')
    expect(setNameUpdateUserResponse.data.user.isAdmin).toEqual(true)
    expect(
      setNameUpdateUserResponse.data.user.createdAt ===
        setNameUpdateUserResponse.data.user.updatedAt,
    ).toBe(false)
  })

  it(`should update a user's username only`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'adminusername',
      name: 'adminname',
      password: '123',
      admin: true,
    })

    const newUserResponse = await apiClient
      .usersApi({ accessToken })
      .createUser({
        userCreateInputDTO: {
          isAdmin: false,
          password: 'testpass',
          username: 'initialusername',
          email: 'email@example.com',
          name: 'initialname',
          emailVerified: true,
          permissions: [],
        },
      })
    expect(newUserResponse.status).toEqual(201)

    expect(newUserResponse.data.user.name).toEqual('initialname')
    expect(newUserResponse.data.user.username).toEqual('initialusername')
    expect(newUserResponse.data.user.email).toEqual('email@example.com')
    expect(newUserResponse.data.user.isAdmin).toEqual(false)
    expect(
      newUserResponse.data.user.createdAt ===
        newUserResponse.data.user.updatedAt,
    ).toBe(true)

    const setNameUpdateUserResponse = await apiClient
      .usersApi({ accessToken })
      .updateUser({
        userId: newUserResponse.data.user.id,
        userUpdateInputDTO: {
          username: 'newusername',
        },
      })

    expect(setNameUpdateUserResponse.status).toEqual(200)
    expect(setNameUpdateUserResponse.data.user.name).toEqual('initialname')
    expect(setNameUpdateUserResponse.data.user.username).toEqual('newusername')
    expect(setNameUpdateUserResponse.data.user.email).toBe('email@example.com')
    expect(setNameUpdateUserResponse.data.user.isAdmin).toEqual(false)
    expect(
      setNameUpdateUserResponse.data.user.createdAt ===
        setNameUpdateUserResponse.data.user.updatedAt,
    ).toBe(false)
  })

  it(`should update a user's username only [bad input]`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'adminusername',
      name: 'adminname',
      password: '123',
      admin: true,
    })

    const newUserResponse = await apiClient
      .usersApi({ accessToken })
      .createUser({
        userCreateInputDTO: {
          isAdmin: false,
          password: 'testpass',
          username: 'initialusername',
          email: 'email@example.com',
          name: 'initialname',
          emailVerified: true,
          permissions: [],
        },
      })
    expect(newUserResponse.status).toEqual(201)

    expect(newUserResponse.data.user.name).toEqual('initialname')
    expect(newUserResponse.data.user.username).toEqual('initialusername')
    expect(newUserResponse.data.user.email).toEqual('email@example.com')
    expect(newUserResponse.data.user.isAdmin).toEqual(false)
    expect(
      newUserResponse.data.user.createdAt ===
        newUserResponse.data.user.updatedAt,
    ).toBe(true)

    const setNameUpdateUserResponse = await apiClient
      .usersApi({ accessToken })
      .updateUser({
        userId: newUserResponse.data.user.id,
        userUpdateInputDTO: {
          username: '',
        },
      })

    expect(setNameUpdateUserResponse.status).toEqual(400)
  })

  it(`should update a user's email only [bad input]`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'adminusername',
      name: 'adminname',
      password: '123',
      admin: true,
    })

    const newUserResponse = await apiClient
      .usersApi({ accessToken })
      .createUser({
        userCreateInputDTO: {
          isAdmin: false,
          password: 'testpass',
          username: 'initialusername',
          email: 'email@example.com',
          name: 'initialname',
          emailVerified: true,
          permissions: [],
        },
      })
    expect(newUserResponse.status).toEqual(201)

    expect(newUserResponse.data.user.name).toEqual('initialname')
    expect(newUserResponse.data.user.username).toEqual('initialusername')
    expect(newUserResponse.data.user.email).toEqual('email@example.com')
    expect(newUserResponse.data.user.isAdmin).toEqual(false)
    expect(
      newUserResponse.data.user.createdAt ===
        newUserResponse.data.user.updatedAt,
    ).toBe(true)

    const setNameUpdateUserResponse = await apiClient
      .usersApi({ accessToken })
      .updateUser({
        userId: newUserResponse.data.user.id,
        userUpdateInputDTO: {
          email: '',
        },
      })

    expect(setNameUpdateUserResponse.status).toEqual(400)
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
