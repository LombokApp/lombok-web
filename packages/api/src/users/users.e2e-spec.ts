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
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const createUserResponse = await apiClient(accessToken).POST(
      '/api/v1/server/users',
      { body: TEST_USER_INPUT },
    )
    expect(createUserResponse.response.status).toEqual(201)
    expect(createUserResponse.data?.user.id).toBeTruthy()
  })

  it(`should fail to create a user on duplicate username`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'user1',
      password: '123',
      admin: true,
    })

    const duplicateUserResponse = await apiClient(accessToken).POST(
      '/api/v1/server/users',
      { body: { ...TEST_USER_INPUT, username: 'user1' } },
    )
    expect(duplicateUserResponse.response.status).toEqual(409)
  })

  it(`should update a user's email only`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'initialusername',
      name: 'initialname',
      password: '123',
      admin: true,
    })

    const createUserResponse = await apiClient(accessToken).POST(
      '/api/v1/server/users',
      {
        body: {
          isAdmin: false,
          password: 'testpass',
          username: 'testusername',
          name: 'testname',
          emailVerified: true,
          permissions: [],
        },
      },
    )
    expect(createUserResponse.response.status).toEqual(201)
    expect(createUserResponse.data?.user.name).toEqual('testname')
    expect(createUserResponse.data?.user.username).toEqual('testusername')
    expect(createUserResponse.data?.user.email).toEqual(null)
    expect(createUserResponse.data?.user.isAdmin).toEqual(false)
    expect(
      createUserResponse.data?.user.createdAt ===
        createUserResponse.data?.user.updatedAt,
    ).toBe(true)

    const setEmailUpdateUserResponse = await apiClient(accessToken).PATCH(
      '/api/v1/server/users/{userId}',
      {
        params: { path: { userId: createUserResponse.data?.user.id ?? '' } },
        body: { email: 'email@example.com' },
      },
    )
    expect(setEmailUpdateUserResponse.response.status).toEqual(200)
    expect(setEmailUpdateUserResponse.data?.user.name).toEqual('testname')
    expect(setEmailUpdateUserResponse.data?.user.username).toEqual(
      'testusername',
    )
    expect(setEmailUpdateUserResponse.data?.user.email).toBe(
      'email@example.com',
    )
    expect(setEmailUpdateUserResponse.data?.user.isAdmin).toEqual(false)
    expect(
      setEmailUpdateUserResponse.data?.user.createdAt ===
        setEmailUpdateUserResponse.data?.user.updatedAt,
    ).toBe(false)
  })

  it(`should remove a user's email`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'initialusername',
      name: 'initialname',
      password: '123',
      admin: true,
    })

    const createUserResponse = await apiClient(accessToken).POST(
      '/api/v1/server/users',
      {
        body: {
          isAdmin: false,
          password: 'testpass',
          username: 'testusername',
          email: 'email@example.com',
          name: 'testname',
          emailVerified: true,
          permissions: [],
        },
      },
    )
    expect(createUserResponse.response.status).toEqual(201)
    expect(createUserResponse.data?.user.name).toEqual('testname')
    expect(createUserResponse.data?.user.username).toEqual('testusername')
    expect(createUserResponse.data?.user.email).toBe('email@example.com')
    expect(createUserResponse.data?.user.isAdmin).toEqual(false)
    expect(
      createUserResponse.data?.user.createdAt ===
        createUserResponse.data?.user.updatedAt,
    ).toBe(true)

    const setEmailUpdateUserResponse = await apiClient(accessToken).PATCH(
      '/api/v1/server/users/{userId}',
      {
        params: { path: { userId: createUserResponse.data?.user.id ?? '' } },
        body: { email: null },
      },
    )
    expect(setEmailUpdateUserResponse.response.status).toEqual(200)
    expect(setEmailUpdateUserResponse.data?.user.name).toEqual('testname')
    expect(setEmailUpdateUserResponse.data?.user.username).toEqual(
      'testusername',
    )
    expect(setEmailUpdateUserResponse.data?.user.email).toBeNull()
    expect(setEmailUpdateUserResponse.data?.user.isAdmin).toEqual(false)
    expect(
      setEmailUpdateUserResponse.data?.user.createdAt ===
        setEmailUpdateUserResponse.data?.user.updatedAt,
    ).toBe(false)
  })

  it(`should update a user's name only`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'adminusername',
      name: 'adminname',
      password: '123',
      admin: true,
    })

    const createUserResponse = await apiClient(accessToken).POST(
      '/api/v1/server/users',
      {
        body: {
          isAdmin: false,
          password: 'testpass',
          username: 'initialusername',
          email: 'email@example.com',
          emailVerified: true,
          permissions: [],
        },
      },
    )
    expect(createUserResponse.response.status).toEqual(201)
    expect(createUserResponse.data?.user.name).toEqual(null)
    expect(createUserResponse.data?.user.username).toEqual('initialusername')
    expect(createUserResponse.data?.user.email).toBe('email@example.com')
    expect(createUserResponse.data?.user.isAdmin).toEqual(false)
    expect(
      createUserResponse.data?.user.createdAt ===
        createUserResponse.data?.user.updatedAt,
    ).toBe(true)

    const setNameUpdateUserResponse = await apiClient(accessToken).PATCH(
      '/api/v1/server/users/{userId}',
      {
        params: { path: { userId: createUserResponse.data?.user.id ?? '' } },
        body: { name: 'newname' },
      },
    )
    expect(setNameUpdateUserResponse.response.status).toEqual(200)
    expect(setNameUpdateUserResponse.data?.user.name).toEqual('newname')
    expect(setNameUpdateUserResponse.data?.user.username).toEqual(
      'initialusername',
    )
    expect(setNameUpdateUserResponse.data?.user.email).toBe('email@example.com')
    expect(setNameUpdateUserResponse.data?.user.isAdmin).toEqual(false)
    expect(
      setNameUpdateUserResponse.data?.user.createdAt ===
        setNameUpdateUserResponse.data?.user.updatedAt,
    ).toBe(false)
  })

  it(`should update a user's isAdmin flag only`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'adminusername',
      name: 'adminname',
      password: '123',
      admin: true,
    })

    const createUserResponse = await apiClient(accessToken).POST(
      '/api/v1/server/users',
      {
        body: {
          isAdmin: false,
          password: 'testpass',
          username: 'initialusername',
          email: 'email@example.com',
          name: 'initialname',
          emailVerified: true,
          permissions: [],
        },
      },
    )
    expect(createUserResponse.response.status).toEqual(201)
    expect(createUserResponse.data?.user.name).toEqual('initialname')
    expect(createUserResponse.data?.user.username).toEqual('initialusername')
    expect(createUserResponse.data?.user.email).toBe('email@example.com')
    expect(createUserResponse.data?.user.isAdmin).toEqual(false)
    expect(
      createUserResponse.data?.user.createdAt ===
        createUserResponse.data?.user.updatedAt,
    ).toBe(true)

    const setNameUpdateUserResponse = await apiClient(accessToken).PATCH(
      '/api/v1/server/users/{userId}',
      {
        params: { path: { userId: createUserResponse.data?.user.id ?? '' } },
        body: { isAdmin: true },
      },
    )
    expect(setNameUpdateUserResponse.response.status).toEqual(200)
    expect(setNameUpdateUserResponse.data?.user.name).toEqual('initialname')
    expect(setNameUpdateUserResponse.data?.user.username).toEqual(
      'initialusername',
    )
    expect(setNameUpdateUserResponse.data?.user.email).toBe('email@example.com')
    expect(setNameUpdateUserResponse.data?.user.isAdmin).toEqual(true)
    expect(
      setNameUpdateUserResponse.data?.user.createdAt ===
        setNameUpdateUserResponse.data?.user.updatedAt,
    ).toBe(false)
  })

  it(`should update a user's username only`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'adminusername',
      name: 'adminname',
      password: '123',
      admin: true,
    })

    const createUserResponse = await apiClient(accessToken).POST(
      '/api/v1/server/users',
      {
        body: {
          isAdmin: false,
          password: 'testpass',
          username: 'initialusername',
          email: 'email@example.com',
          name: 'initialname',
          emailVerified: true,
          permissions: [],
        },
      },
    )
    expect(createUserResponse.response.status).toEqual(201)
    expect(createUserResponse.data?.user.name).toEqual('initialname')
    expect(createUserResponse.data?.user.username).toEqual('initialusername')
    expect(createUserResponse.data?.user.email).toBe('email@example.com')
    expect(createUserResponse.data?.user.isAdmin).toEqual(false)
    expect(
      createUserResponse.data?.user.createdAt ===
        createUserResponse.data?.user.updatedAt,
    ).toBe(true)

    const setNameUpdateUserResponse = await apiClient(accessToken).PATCH(
      '/api/v1/server/users/{userId}',
      {
        params: { path: { userId: createUserResponse.data?.user.id ?? '' } },
        body: { username: 'newusername' },
      },
    )
    expect(setNameUpdateUserResponse.response.status).toEqual(200)
    expect(setNameUpdateUserResponse.data?.user.name).toEqual('initialname')
    expect(setNameUpdateUserResponse.data?.user.username).toEqual('newusername')
    expect(setNameUpdateUserResponse.data?.user.email).toBe('email@example.com')
    expect(setNameUpdateUserResponse.data?.user.isAdmin).toEqual(false)
    expect(
      setNameUpdateUserResponse.data?.user.createdAt ===
        setNameUpdateUserResponse.data?.user.updatedAt,
    ).toBe(false)
  })

  it(`should update a user's username only [bad input]`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'adminusername',
      name: 'adminname',
      password: '123',
      admin: true,
    })

    const createUserResponse = await apiClient(accessToken).POST(
      '/api/v1/server/users',
      {
        body: {
          isAdmin: false,
          password: 'testpass',
          username: 'initialusername',
          email: 'email@example.com',
          name: 'initialname',
          emailVerified: true,
          permissions: [],
        },
      },
    )
    expect(createUserResponse.response.status).toEqual(201)
    expect(createUserResponse.data?.user.name).toEqual('initialname')
    expect(createUserResponse.data?.user.username).toEqual('initialusername')
    expect(createUserResponse.data?.user.email).toBe('email@example.com')
    expect(createUserResponse.data?.user.isAdmin).toEqual(false)
    expect(
      createUserResponse.data?.user.createdAt ===
        createUserResponse.data?.user.updatedAt,
    ).toBe(true)

    const setNameUpdateUserResponse = await apiClient(accessToken).PATCH(
      '/api/v1/server/users/{userId}',
      {
        params: { path: { userId: createUserResponse.data?.user.id ?? '' } },
        body: { username: '' },
      },
    )
    expect(setNameUpdateUserResponse.response.status).toEqual(400)
  })

  it(`should update a user's email only [bad input]`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'adminusername',
      name: 'adminname',
      password: '123',
      admin: true,
    })

    const createUserResponse = await apiClient(accessToken).POST(
      '/api/v1/server/users',
      {
        body: {
          isAdmin: false,
          password: 'testpass',
          username: 'initialusername',
          email: 'email@example.com',
          name: 'initialname',
          emailVerified: true,
          permissions: [],
        },
      },
    )
    expect(createUserResponse.response.status).toEqual(201)
    expect(createUserResponse.data?.user.name).toEqual('initialname')
    expect(createUserResponse.data?.user.username).toEqual('initialusername')
    expect(createUserResponse.data?.user.email).toBe('email@example.com')
    expect(createUserResponse.data?.user.isAdmin).toEqual(false)
    expect(
      createUserResponse.data?.user.createdAt ===
        createUserResponse.data?.user.updatedAt,
    ).toBe(true)

    const setNameUpdateUserResponse = await apiClient(accessToken).PATCH(
      '/api/v1/server/users/{userId}',
      {
        params: { path: { userId: createUserResponse.data?.user.id ?? '' } },
        body: { email: '' },
      },
    )
    expect(setNameUpdateUserResponse.response.status).toEqual(400)
  })

  it(`should get a user by id`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const createUserResponse = await apiClient(accessToken).POST(
      '/api/v1/server/users',
      { body: TEST_USER_INPUT },
    )
    expect(createUserResponse.response.status).toEqual(201)

    const fetchedUserResponse = await apiClient(accessToken).GET(
      '/api/v1/server/users/{userId}',
      {
        params: { path: { userId: createUserResponse.data?.user.id ?? '' } },
      },
    )
    expect(fetchedUserResponse.response.status).toEqual(200)

    expect(fetchedUserResponse.data?.user.email).toEqual(TEST_USER_INPUT.email)
    expect(fetchedUserResponse.data?.user.emailVerified).toEqual(
      TEST_USER_INPUT.emailVerified,
    )
    expect(fetchedUserResponse.data?.user.isAdmin).toEqual(
      TEST_USER_INPUT.isAdmin,
    )
    expect(fetchedUserResponse.data?.user.name).toEqual(TEST_USER_INPUT.name)
    expect(fetchedUserResponse.data?.user.username).toEqual(
      TEST_USER_INPUT.username,
    )
  })

  it(`should list users`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const listUsersResponse = await apiClient(accessToken).GET(
      '/api/v1/server/users',
    )

    expect(listUsersResponse.response.status).toEqual(200)
    expect(listUsersResponse.data?.result.length).toEqual(1)
    expect(listUsersResponse.data?.result.length).toEqual(
      listUsersResponse.data?.meta.totalCount,
    )
  })

  it(`should delete a user by id`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const createUserResponse = await apiClient(accessToken).POST(
      '/api/v1/server/users',
      { body: TEST_USER_INPUT },
    )
    expect(createUserResponse.response.status).toEqual(201)

    const deletedUserResponse = await apiClient(accessToken).DELETE(
      '/api/v1/server/users/{userId}',
      {
        params: { path: { userId: createUserResponse.data?.user.id ?? '' } },
      },
    )

    expect(deletedUserResponse.response.status).toEqual(200)

    const fetchedUserResponse = await apiClient(accessToken).GET(
      '/api/v1/server/users/{userId}',
      {
        params: { path: { userId: createUserResponse.data?.user.id ?? '' } },
      },
    )
    expect(fetchedUserResponse.response.status).toEqual(404)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
