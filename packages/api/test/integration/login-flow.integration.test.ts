import { authApi, viewerApi } from '../support/api-client'
import { createUser } from '../utils/create-user'

const TEST_USERNAME = 'User1'
const TEST_USER_EMAIL = 'user1@example.com'
const TEST_USER_PASS = '123123123123'

describe('authentication flow', () => {
  describe('POST /login (with username)', () => {
    it('should support dev login', async () => {
      await createUser({
        username: TEST_USERNAME,
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASS,
      })

      const res = await authApi().login({
        loginParams: {
          login: TEST_USERNAME,
          password: TEST_USER_PASS,
        },
      })
      expect(res.status).toBe(200)
    })
  })

  describe('POST /login (with email)', () => {
    it('should support dev login', async () => {
      await createUser({
        username: TEST_USERNAME,
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASS,
      })

      const res = await authApi().login({
        loginParams: {
          login: TEST_USER_EMAIL,
          password: TEST_USER_PASS,
        },
      })
      expect(res.status).toBe(200)
    })
  })

  describe('GET /viewer', () => {
    it('should return a user object', async () => {
      await createUser({
        username: TEST_USERNAME,
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASS,
      })

      const {
        data: {
          data: { accessToken },
        },
      } = await authApi().login({
        loginParams: {
          login: TEST_USERNAME,
          password: TEST_USER_PASS,
        },
      })

      const resp = await viewerApi({
        accessToken,
      }).getViewer()

      expect(resp.status).toBe(200)
      expect(resp.data.data.username).toBe(TEST_USERNAME)
    })
  })
})
