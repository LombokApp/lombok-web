import type { Server } from 'bun'

export interface PresignedUrlRequest {
  folderId: string
  objectKey: string
  method: 'PUT' | 'GET' | 'DELETE' | 'HEAD'
}

export interface PresignedUrlResponse {
  folderId: string
  objectKey: string
  method: 'PUT' | 'GET' | 'DELETE' | 'HEAD'
  url: string
}

export interface CompletionRequest {
  success: boolean
  result?: unknown
  error?: {
    code: string
    message: string
    name?: string
    details?: unknown
  }
  outputFiles?: Array<{
    folderId: string
    objectKey: string
  }>
}

export interface MockPlatformState {
  uploadUrlRequests: Array<{
    jobId: string
    body: PresignedUrlRequest[]
    timestamp: number
  }>
  startRequests: Array<{
    jobId: string
    timestamp: number
  }>
  completionRequests: Array<{
    jobId: string
    body: CompletionRequest
    timestamp: number
  }>
}

export class MockPlatformServer {
  private server: Server<undefined> | null = null
  private port: number
  private verbose: boolean
  private fileServerPort: number
  private state: MockPlatformState = {
    uploadUrlRequests: [],
    startRequests: [],
    completionRequests: [],
  }

  constructor(options: {
    platformPort?: number
    fileServerPort?: number
    verbose?: boolean
  }) {
    this.port = options.platformPort || 3002
    this.fileServerPort = options.fileServerPort || 3003
    this.verbose = options.verbose ?? false
  }

  /**
   * Start the mock platform server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = Bun.serve({
          port: this.port,
          hostname: '0.0.0.0',
          fetch: async (req) => {
            return this.handleRequest(req)
          },
        })

        console.log(`Mock platform server listening on port ${this.port}`)
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Stop the mock platform server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve()
        return
      }

      this.server.stop()
      console.log('Mock platform server stopped')
      resolve()
    })
  }

  /**
   * Get the current state
   */
  getState(): MockPlatformState {
    return { ...this.state }
  }

  /**
   * Reset the state
   */
  resetState(): void {
    this.state = {
      uploadUrlRequests: [],
      startRequests: [],
      completionRequests: [],
    }
  }

  /**
   * Get the base URL for the platform
   */
  getBaseUrl(): string {
    // Use host.docker.internal so containers can reach the host
    return `http://host.docker.internal:${this.port}`
  }

  /**
   * Handle incoming requests
   */
  private async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const path = url.pathname

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders })
    }

    // Check authorization header (optional - for testing we might not require it)
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    // POST /api/v1/docker/jobs/:jobId/request-presigned-urls
    const uploadUrlMatch = path.match(
      /^\/api\/v1\/docker\/jobs\/([^/]+)\/request-presigned-urls$/,
    )
    if (uploadUrlMatch && req.method === 'POST') {
      const jobId = uploadUrlMatch[1]!
      const body = (await req.json()) as PresignedUrlRequest[]

      if (this.verbose) {
        console.log(
          `[Presigned URL Request] JobId: ${jobId}, Files: ${body.length}`,
        )
        body.forEach((file, index) => {
          console.log(
            `  [${index + 1}] FolderId: ${file.folderId}, ObjectKey: ${
              file.objectKey
            }, Method: ${file.method}`,
          )
        })
      }

      this.state.uploadUrlRequests.push({
        jobId,
        body,
        timestamp: Date.now(),
      })

      // Generate presigned URLs pointing to file server
      const response: { urls: PresignedUrlResponse[] } = {
        urls: body.map((file) => ({
          folderId: file.folderId,
          objectKey: file.objectKey,
          method: file.method,
          url: `http://host.docker.internal:${this.fileServerPort}/upload/${
            file.folderId
          }/${encodeURIComponent(file.objectKey)}`,
        })),
      }

      if (this.verbose) {
        console.log(
          `[Presigned URL Response] JobId: ${jobId}, Generated ${response.urls.length} URL(s)`,
        )
        response.urls.forEach((url, index) => {
          console.log(`  [${index + 1}] ${url.url}`)
        })
      }
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // POST /api/v1/docker/jobs/:jobId/start
    const startMatch = path.match(/^\/api\/v1\/docker\/jobs\/([^/]+)\/start$/)
    if (startMatch && req.method === 'POST') {
      const jobId = startMatch[1]!
      this.state.startRequests.push({ jobId, timestamp: Date.now() })

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // POST /api/v1/docker/jobs/:jobId/complete
    const completeMatch = path.match(
      /^\/api\/v1\/docker\/jobs\/([^/]+)\/complete$/,
    )
    if (completeMatch && req.method === 'POST') {
      const jobId = completeMatch[1]!
      const body = (await req.json()) as CompletionRequest

      this.state.completionRequests.push({
        jobId,
        body,
        timestamp: Date.now(),
      })

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Not found
    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain', ...corsHeaders },
    })
  }
}
