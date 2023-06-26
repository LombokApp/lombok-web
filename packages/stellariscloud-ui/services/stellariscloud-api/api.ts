import type { WorkerTokenDTO } from '@stellariscloud/types'
import defaultAxios from 'axios'

export interface APIResult<T> {
  result: T
}

const axios = defaultAxios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
})

const generateWebsocketToken = ({ folderId }: { folderId: string }) => {
  return axios.post<{ token: string }>(
    `/folders/${folderId}/websocket/authorize`,
  )
}

export const setupInterceptors = (
  getAccessToken: () => Promise<string | undefined>,
  logout?: () => Promise<void>,
) => {
  axios.interceptors.response.use((response) => {
    if (response.status === 401) {
      console.log('triggering logout!!')
      if (logout) {
        void logout()
      }
    }
    return response
  })

  axios.interceptors.request.use(
    async (config) => {
      const token = await getAccessToken()
      // config.baseURL = 'http://localhost:3000/api'
      config.headers['Authorization'] = `Bearer ${token}`
      config.headers['Content-Type'] = 'application/json'
      return config
    },
    (error) => {
      return Promise.reject(error)
    },
  )
}

export const api = {
  listWorkerTokens: () => {
    return axios.get<APIResult<WorkerTokenDTO[]>>('/worker-tokens')
  },
  createWorkerToken: (input: { name: string }) => {
    return axios.post<APIResult<WorkerTokenDTO>>('/worker-tokens', input)
  },
  deleteWorkerToken: (id: string) => {
    return axios.delete<{ success: boolean }>(`/worker-tokens/${id}`)
  },
  refreshWorkerToken: (id: string) => {
    return axios.post<APIResult<WorkerTokenDTO>>(`/worker-tokens/${id}/refresh`)
  },
  folderWebSocket: async ({ folderId }: { folderId: string }) => {
    const {
      data: { token },
    } = await generateWebsocketToken({ folderId })
    return new WebSocket(
      `${(process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(
        'http',
        'ws',
      )}/folders/${folderId}/websocket?token=${token}`,
    )
  },
}
