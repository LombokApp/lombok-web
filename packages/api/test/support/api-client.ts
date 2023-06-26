import type { ConfigurationParameters } from '@stellariscloud/api-client'
import { AuthApi, Configuration, ViewerApi } from '@stellariscloud/api-client'
import request from 'supertest'
import { container } from 'tsyringe'

import { App } from '../../src/app'

const app = container.resolve(App).app

const mockAxios = {
  request: async (config: {
    url: string
    headers: any
    data: any
    method: string
    auth?: { username: string; password: string }
  }) => {
    const { url, headers, data, auth, method = 'GET' } = config

    const fn: 'get' | 'post' | 'options' | 'patch' | 'put' | 'delete' =
      method.toLowerCase() as any

    if (auth) {
      headers.authorization = `Basic ${Buffer.from(
        `${auth.username}:${auth.password}`,
      ).toString('base64')}`
    }

    const response = await request(app)[fn](url).set(headers).send(data)

    return {
      data: response.body,
      status: response.status,
    }
  },
}

export const authApi = (config?: ConfigurationParameters) =>
  new AuthApi(new Configuration(config), '/api/v1', mockAxios as any)

export const viewerApi = (config?: ConfigurationParameters) =>
  new ViewerApi(new Configuration(config), '/api/v1', mockAxios as any)

export * from '@stellariscloud/api-client'
