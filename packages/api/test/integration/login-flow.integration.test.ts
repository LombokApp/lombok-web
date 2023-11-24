import { authApi, viewerApi } from '../support/api-client'
import { createUser } from '../utils/create-user'

const USER_1_USERNAME = 'User1'
const USER_1_USER_EMAIL = 'user1@example.com'
const USER_1_USER_PASS = '123123123123'

const ADMIN_1_USERNAME = 'Admin1'
const ADMIN_1_EMAIL = 'admin1@example.com'
const ADMIN_1_PASS = '123123123123'

describe('authentication flow', () => {
  describe('POST /login (with username)', () => {
    it('should support user login', async () => {
      await createUser({
        username: USER_1_USERNAME,
        email: USER_1_USER_EMAIL,
        password: USER_1_USER_PASS,
        isAdmin: false,
      })

      const res = await authApi().login({
        loginParams: {
          login: USER_1_USERNAME,
          password: USER_1_USER_PASS,
        },
      })
      expect(res.status).toBe(200)

      const viewerResp = await viewerApi({
        accessToken: res.data.accessToken,
      }).getViewer()

      expect(res.data.accessToken).toBeDefined()
      expect(viewerResp.data.user.isAdmin).toBe(false)
    })

    it('should support admin login', async () => {
      await createUser({
        username: ADMIN_1_USERNAME,
        email: ADMIN_1_EMAIL,
        password: ADMIN_1_PASS,
        isAdmin: true,
      })

      const res = await authApi().login({
        loginParams: {
          login: ADMIN_1_USERNAME,
          password: ADMIN_1_PASS,
        },
      })
      expect(res.status).toBe(200)

      const viewerResp = await viewerApi({
        accessToken: res.data.accessToken,
      }).getViewer()

      expect(res.status).toBe(200)
      expect(res.data.accessToken).toBeDefined()
      expect(viewerResp.data.user.isAdmin).toBe(true)
    })
  })

  describe('POST /login (with email)', () => {
    it('should support dev login', async () => {
      await createUser({
        username: USER_1_USERNAME,
        email: USER_1_USER_EMAIL,
        password: USER_1_USER_PASS,
      })

      const res = await authApi().login({
        loginParams: {
          login: USER_1_USER_EMAIL,
          password: USER_1_USER_PASS,
        },
      })
      expect(res.status).toBe(200)
    })
  })

  describe('GET /viewer', () => {
    it('should return a user object', async () => {
      await createUser({
        username: USER_1_USERNAME,
        email: USER_1_USER_EMAIL,
        password: USER_1_USER_PASS,
      })

      const { status, data } = await authApi().login({
        loginParams: {
          login: USER_1_USERNAME,
          password: USER_1_USER_PASS,
        },
      })

      expect(status).toBe(200)

      const resp = await viewerApi({
        accessToken: data.accessToken,
      }).getViewer()

      expect(resp.status).toBe(200)
      expect(resp.data.user.username).toBe(USER_1_USERNAME)
    })
  })
})
