// import { container } from 'tsyringe'
// import { OrmService } from '../../src/orm/orm.service'
// import type { SessionResponse } from '@stellariscloud/api-client'

import { authApi, viewerApi } from '../support/api-client'

// const ormService = container.resolve(OrmService)

const TEST_USER_ID = ''

describe('authentication flow', () => {
  describe('POST /login', () => {
    it('should support dev login', async () => {
      const res = await authApi().login({
        loginParams: {
          login: TEST_USER_ID,
          password: '',
        },
      })
      expect(res.status).toBe(200)
    })
  })

  describe('GET /viewer', () => {
    it('should return a user object', async () => {
      const {
        data: {
          data: { accessToken },
        },
      } = await authApi().login({
        loginParams: {
          login: TEST_USER_ID,
          password: '',
        },
      })

      const resp = await viewerApi({
        accessToken,
      }).getViewer()

      expect(resp.status).toBe(200)
      expect(resp.data.data.id).toBe(TEST_USER_ID)
    })
  })
})
