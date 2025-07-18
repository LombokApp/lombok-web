import type { INestApplication } from '@nestjs/common'
import type { paths } from '@stellariscloud/types'
import createFetch from 'openapi-fetch'
import request from 'supertest'
import type { App } from 'supertest/types'

export interface SupertestApiClientConfigParams {
  accessToken?: string
}

/**
 * Builds a supertest-based API client using openapi-fetch
 *
 * Usage example:
 * ```typescript
 * const client = buildSupertestApiClient(app)('access-token')
 *
 * // Make API calls
 * const response = await client.GET('/api/v1/folders/{folderId}', {
 *   params: { folderId: '123' }
 * })
 *
 * const createResponse = await client.POST('/api/v1/folders', {
 *   body: { name: 'New Folder', ... }
 * })
 * ```
 */
export function buildSupertestApiClient(app: INestApplication) {
  function buildMockFetch(accessToken?: string) {
    return async (input: Request | string, init?: RequestInit) => {
      let method: string
      let headers: HeadersInit
      let body: unknown

      if (typeof input === 'string') {
        method = init?.method || 'GET'
        headers = init?.headers || {}
        body = init?.body
      } else {
        method = input.method || 'GET'
        headers = input.headers
        // Read the body from the Request stream
        body = await input.text()
        if (body === '') {
          body = undefined
        }
      }

      // Parse the URL to extract path and query parameters
      const urlObj = new URL(
        typeof input === 'string' ? input : input.url,
        'http://localhost',
      )
      const path = urlObj.pathname

      // Create supertest request
      const supertestReq = request(app.getHttpServer() as App)
      let req =
        supertestReq[
          method.toLowerCase() as
            | 'get'
            | 'post'
            | 'put'
            | 'patch'
            | 'delete'
            | 'options'
            | 'head'
        ](path)

      // Set headers
      if (accessToken) {
        req = req.set('Authorization', `Bearer ${accessToken}`)
      }

      // Set additional headers
      if (
        typeof (headers as Headers).forEach === 'function' &&
        headers instanceof Headers
      ) {
        // Headers object
        headers.forEach((value: string, key: string) => {
          req = req.set(key, value)
        })
      } else if (typeof headers === 'object') {
        // Plain object
        Object.entries(headers).forEach(([key, value]) => {
          if (typeof value === 'string') {
            req = req.set(key, value)
          }
        })
      }

      // Set query parameters
      urlObj.searchParams.forEach((value, key) => {
        req = req.query({ [key]: value })
      })

      // Send body if present
      if (body !== undefined) {
        // Determine content type
        let contentType: string | undefined
        if (headers instanceof Headers) {
          contentType =
            headers.get('content-type') ||
            headers.get('Content-Type') ||
            undefined
        } else if (typeof headers === 'object') {
          contentType =
            (headers['content-type'] as string) ||
            (headers['Content-Type'] as string)
        }
        if (contentType?.includes('application/json')) {
          try {
            req = req.send(JSON.parse(body as string) as object)
          } catch {
            req = req.send(body as string)
          }
        } else {
          req = req.send(body as string)
        }
      }

      const response = await req

      // Return a real Response object as expected by openapi-fetch
      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: response.headers as Record<string, string>,
      })
    }
  }

  const createApiClient = (accessToken?: string) => {
    const fetch = buildMockFetch(accessToken)
    return createFetch<paths>({
      baseUrl: 'http://localhost',
      fetch,
    })
  }

  // Return a single client instance that can be used for all API calls
  return (accessToken?: string) => createApiClient(accessToken)
}
