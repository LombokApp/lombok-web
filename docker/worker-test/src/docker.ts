import Docker from 'dockerode'
import fs from 'fs/promises'
import path from 'path'
import { PassThrough } from 'stream'

import type { ContainerConfig } from './config'

export interface DockerExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

export interface ContainerInfo {
  id: string
  image: string
  state: 'running' | 'exited' | 'paused' | 'created' | 'unknown'
}

export interface BuildImageOptions {
  dockerfile: string
  buildContext: string
  imageName: string
  buildArgs?: Record<string, string>
  tag?: string
  noCache?: boolean
}

export interface PushImageOptions {
  imageName: string
  registry: {
    url: string
    username?: string
    password?: string
  }
}

export class DockerClient {
  private docker: Docker
  private dockerHost: string

  constructor(dockerHost?: string) {
    this.dockerHost = dockerHost || '/var/run/docker.sock'
    const isHttpEndpoint = /^https?:\/\//i.test(this.dockerHost)

    if (isHttpEndpoint) {
      const url = new URL(this.dockerHost)
      this.docker = new Docker({
        host: url.hostname,
        port: url.port || (url.protocol === 'https:' ? '443' : '2375'),
        protocol: url.protocol === 'https:' ? 'https' : 'http',
      })
    } else {
      this.docker = new Docker({ socketPath: this.dockerHost })
    }
  }

  /**
   * Build a Docker image
   */
  async buildImage(options: BuildImageOptions): Promise<void> {
    const { dockerfile, buildContext, buildArgs, noCache, imageName, tag } =
      options

    const src = await this.getBuildContextSources(buildContext)

    return new Promise((resolve, reject) => {
      const buildOptions: Docker.ImageBuildOptions = {
        dockerfile,
        buildargs: buildArgs,
        nocache: noCache,
        t: tag ?? imageName,
      }

      this.docker.buildImage(
        {
          context: buildContext,
          src,
        },
        buildOptions,
        (err, stream) => {
          if (err) {
            reject(err)
            return
          }

          if (!stream) {
            reject(new Error('Build stream is null'))
            return
          }

          // Collect build output
          stream.on('data', (chunk: Buffer) => {
            const text = chunk.toString('utf-8')
            // Try to parse JSON lines for progress
            const lines = text.split('\n').filter(Boolean)
            for (const line of lines) {
              try {
                const json = JSON.parse(line)
                if (json.stream) {
                  process.stdout.write(json.stream)
                } else if (json.error) {
                  process.stderr.write(`Error: ${json.error}\n`)
                } else if (json.status) {
                  process.stdout.write(`${json.status}\n`)
                }
              } catch {
                // Not JSON, ignore
              }
            }
          })

          stream.on('end', () => {
            resolve()
          })

          stream.on('error', (error) => {
            reject(error)
          })
        },
      )
    })
  }

  /**
   * Compute the list of files to include in the build context, honoring .dockerignore if present.
   */
  private async getBuildContextSources(
    buildContext: string,
  ): Promise<string[]> {
    const dockerignorePath = path.join(buildContext, '.dockerignore')
    let ignorePatterns: string[] = []

    try {
      const contents = await fs.readFile(dockerignorePath, 'utf-8')
      ignorePatterns = contents
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => {
          if (line.length === 0) {
            return false
          }

          if (line.startsWith('#')) {
            return false
          }

          return true
        })
    } catch {
      // No .dockerignore, fall back to including everything in the context.
      ignorePatterns = []
    }

    const sources: string[] = []

    const shouldIgnore = (relativePath: string): boolean => {
      if (!relativePath || relativePath === '.') {
        return false
      }

      const normalized = relativePath.split(path.sep).join('/')

      for (const pattern of ignorePatterns) {
        const normalizedPattern = pattern.replace(/\/+$/, '')

        if (normalized === normalizedPattern) {
          return true
        }

        if (normalized.startsWith(`${normalizedPattern}/`)) {
          return true
        }
      }

      return false
    }

    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        const relativeFromContext = path.relative(buildContext, fullPath)

        if (shouldIgnore(relativeFromContext)) {
          continue
        }

        if (entry.isDirectory()) {
          await walk(fullPath)
        } else if (entry.isFile()) {
          // Dockerode expects paths relative to the context directory.
          sources.push(relativeFromContext.split(path.sep).join('/'))
        }
      }
    }

    await walk(buildContext)

    return sources
  }

  /**
   * Push an image to a registry
   */
  async pushImage(options: PushImageOptions): Promise<void> {
    const { imageName, registry } = options
    const image = this.docker.getImage(imageName)

    const authconfig =
      registry.username && registry.password
        ? {
            username: registry.username,
            password: registry.password,
            serveraddress: registry.url,
          }
        : undefined

    return new Promise((resolve, reject) => {
      image.push({ authconfig }, (err, stream) => {
        if (err) {
          reject(err)
          return
        }

        if (!stream) {
          reject(new Error('Push stream is null'))
          return
        }

        stream.on('data', (chunk: Buffer) => {
          const text = chunk.toString('utf-8')
          const lines = text.split('\n').filter(Boolean)
          for (const line of lines) {
            try {
              const json = JSON.parse(line)
              if (json.status) {
                process.stdout.write(`${json.status}\n`)
              } else if (json.error) {
                process.stderr.write(`Error: ${json.error}\n`)
              }
            } catch {
              // Not JSON, ignore
            }
          }
        })

        stream.on('end', () => {
          resolve()
        })

        stream.on('error', (error) => {
          reject(error)
        })
      })
    })
  }

  /**
   * Create and start a container
   */
  async createContainer(
    image: string,
    config: ContainerConfig,
    labels?: Record<string, string>,
  ): Promise<ContainerInfo> {
    const createOptions: Docker.ContainerCreateOptions = {
      Image: image,
      Env: config.environmentVariables
        ? Object.entries(config.environmentVariables).map(
            ([key, value]) => `${key}=${value}`,
          )
        : undefined,
      Labels: labels || {},
      ...(config.gpus ||
      config.networkMode ||
      config.volumes ||
      config.extraHosts
        ? {
            HostConfig: {
              ...(config.volumes && {
                Binds: config.volumes,
              }),
              ...(config.extraHosts && {
                ExtraHosts: config.extraHosts,
              }),
              ...(config.networkMode && { NetworkMode: config.networkMode }),
              ...(config.gpus && {
                DeviceRequests: [
                  {
                    Driver: config.gpus.driver,
                    DeviceIDs: config.gpus.deviceIds,
                    Options: {},
                    Capabilities: [['gpu']],
                  },
                ],
              }),
            },
          }
        : {}),
    }

    const container = await this.docker.createContainer(createOptions)
    await container.start()

    return {
      id: container.id,
      image,
      state: 'running',
    }
  }

  /**
   * Execute a command in a container
   */
  async execInContainer(
    containerId: string,
    command: string[],
  ): Promise<DockerExecResult> {
    const container = this.docker.getContainer(containerId)

    const exec = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
    })

    const stream = await exec.start({ Tty: false })

    const stdoutStream = new PassThrough()
    const stderrStream = new PassThrough()

    this.docker.modem.demuxStream(stream, stdoutStream, stderrStream)

    let stdout = ''
    let stderr = ''

    stdoutStream.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf-8')
    })

    stderrStream.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8')
    })

    return new Promise((resolve, reject) => {
      stream.on('end', async () => {
        try {
          const inspect = await exec.inspect()
          resolve({
            stdout,
            stderr,
            exitCode: inspect.ExitCode || 0,
          })
        } catch (error) {
          reject(error)
        }
      })

      stream.on('error', (error) => {
        reject(error)
      })
    })
  }

  /**
   * Get container logs
   */
  async getContainerLogs(
    containerId: string,
    options?: { tail?: number },
  ): Promise<string> {
    const container = this.docker.getContainer(containerId)
    const logs = (await container.logs({
      stdout: true,
      stderr: true,
      follow: false,
      tail: options?.tail || 200,
    })) as Buffer

    return logs.toString('utf-8')
  }

  /**
   * Stream (live tail) container logs to stdout/stderr.
   * This attaches a log stream that will continue until the container stops
   * or the underlying Docker daemon closes the stream.
   */
  streamContainerLogs(containerId: string, options?: { tail?: number }): void {
    const container = this.docker.getContainer(containerId)

    container.logs(
      {
        stdout: true,
        stderr: true,
        follow: true,
        tail: options?.tail ?? 100,
      },
      (err, stream) => {
        if (err) {
          // Log the error but do not fail the test run because of log streaming issues.
          // eslint-disable-next-line no-console
          console.error('Failed to stream container logs:', err)
          return
        }

        if (!stream) {
          // eslint-disable-next-line no-console
          console.error('Log stream is null')
          return
        }

        stream.on('data', (chunk: Buffer) => {
          const text = chunk.toString('utf-8')
          process.stdout.write(text)
        })

        stream.on('error', (error) => {
          // eslint-disable-next-line no-console
          console.error('Container log stream error:', error)
        })
      },
    )
  }

  /**
   * Remove a container
   */
  async removeContainer(containerId: string, force = false): Promise<void> {
    const container = this.docker.getContainer(containerId)
    await container.remove({ force })
  }

  /**
   * Check if an image exists locally
   */
  async imageExists(imageName: string): Promise<boolean> {
    try {
      await this.docker.getImage(imageName).inspect()
      return true
    } catch {
      return false
    }
  }
}
