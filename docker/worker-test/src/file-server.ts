import type { Server } from 'bun'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname, resolve } from 'path'

export interface UploadedFile {
  folderId: string
  objectKey: string
  contentType: string
  body: string | Buffer
  timestamp: number
}

export interface FileServerState {
  uploadedFiles: UploadedFile[]
}

export class FileServer {
  private server: Server<undefined> | null = null
  private port: number
  private verbose: boolean
  private rootDir: string
  private state: FileServerState = {
    uploadedFiles: [],
  }

  constructor(options: { port?: number; rootDir?: string; verbose?: boolean }) {
    this.port = options.port || 3003
    this.rootDir = options.rootDir || resolve(process.cwd(), 'test-files')
    this.verbose = options.verbose ?? false
  }

  /**
   * Start the file server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Ensure root directory exists
        if (!existsSync(this.rootDir)) {
          mkdirSync(this.rootDir, { recursive: true })
        }

        this.server = Bun.serve({
          port: this.port,
          hostname: '0.0.0.0',
          fetch: async (req) => {
            return this.handleRequest(req)
          },
        })

        console.log(`File server listening on port ${this.port}`)
        console.log(`Serving files from: ${this.rootDir}`)
        console.log(`Uploads will be saved to: ${this.rootDir}/uploads`)
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Stop the file server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve()
        return
      }

      this.server.stop()
      console.log('File server stopped')
      resolve()
    })
  }

  /**
   * Get the current state
   */
  getState(): FileServerState {
    return { ...this.state }
  }

  /**
   * Get uploaded files
   */
  getUploadedFiles(): UploadedFile[] {
    return [...this.state.uploadedFiles]
  }

  /**
   * Reset the state
   */
  resetState(): void {
    this.state = {
      uploadedFiles: [],
    }
  }

  /**
   * Get the base URL for the file server
   */
  getBaseUrl(): string {
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
      'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders })
    }

    // Handle all PUT requests as file uploads
    if (req.method === 'PUT') {
      const contentType =
        req.headers.get('content-type') || 'application/octet-stream'
      const contentLength = req.headers.get('content-length')

      // Map the incoming path directly to the local directory structure
      // Remove leading slash and use path as-is relative to rootDir
      const normalizedPath = path.startsWith('/') ? path.slice(1) : path
      const filePath = join(this.rootDir, normalizedPath)

      if (this.verbose) {
        console.log(
          `[Upload Start] Path: ${path}, LocalPath: ${filePath}, ContentType: ${contentType}, ContentLength: ${
            contentLength || 'unknown'
          }`,
        )
      }

      const startTime = Date.now()
      const body = await req.arrayBuffer()
      const bodyBuffer = Buffer.from(body)
      const uploadDuration = Date.now() - startTime

      const pathParts = normalizedPath.split('/').filter(Boolean)
      const folderId = pathParts.length > 1 ? pathParts[0]! : 'uploads'
      const objectKey =
        pathParts.length > 1 ? pathParts.slice(1).join('/') : normalizedPath

      // Store uploaded file
      this.state.uploadedFiles.push({
        folderId,
        objectKey,
        contentType,
        body: bodyBuffer,
        timestamp: Date.now(),
      })

      // Save to disk
      const fileDir = dirname(filePath)
      if (!existsSync(fileDir)) {
        mkdirSync(fileDir, { recursive: true })
      }
      writeFileSync(filePath, bodyBuffer)

      if (this.verbose) {
        console.log(
          `[Upload Complete] Saved: ${filePath}, Size: ${bodyBuffer.length} bytes, Duration: ${uploadDuration}ms`,
        )
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // GET /:filepath - Serve files from mock server's root directory
    if (req.method === 'GET') {
      // remove the leading slash and treat is as a relative local file path
      const fullPath = join(this.rootDir, path.slice(1))
      if (this.verbose) {
        console.log(`[Download request] Path: ${path}, LocalPath: ${fullPath}`)
      }

      // Security: ensure path is within root directory
      const resolvedPath = resolve(fullPath)
      const resolvedRoot = resolve(this.rootDir)
      if (!resolvedPath.startsWith(resolvedRoot)) {
        return new Response('Forbidden', {
          status: 403,
          headers: { 'Content-Type': 'text/plain', ...corsHeaders },
        })
      }

      if (!existsSync(resolvedPath)) {
        return new Response('Not Found', {
          status: 404,
          headers: { 'Content-Type': 'text/plain', ...corsHeaders },
        })
      }

      try {
        const content = readFileSync(resolvedPath)
        return new Response(content, {
          status: 200,
          headers: {
            'Content-Type': 'application/octet-stream',
            ...corsHeaders,
          },
        })
      } catch (err) {
        return new Response(
          `Error reading file: ${
            err instanceof Error ? err.message : String(err)
          }`,
          {
            status: 500,
            headers: { 'Content-Type': 'text/plain', ...corsHeaders },
          },
        )
      }
    }

    // Not found
    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain', ...corsHeaders },
    })
  }
}
