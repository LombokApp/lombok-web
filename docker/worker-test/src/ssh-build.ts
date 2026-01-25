import { Client } from 'ssh2'
import path from 'path'
import * as tar from 'tar-fs'
import { Readable } from 'stream'

export interface SSHBuildOptions {
  ssh: string // e.g., "user@host"
  dockerfile: string
  buildContext: string
  imageName: string
  buildArgs?: Record<string, string>
  tags?: string[]
  privateKey?: string
  password?: string
  noCache?: boolean
}

export interface SSHConnection {
  host: string
  port: number
  username: string
}

/**
 * Parse SSH connection string (e.g., "user@host" or "user@host:port")
 */
function parseSSHConnection(ssh: string): SSHConnection {
  const parts = ssh.split('@')
  if (parts.length !== 2) {
    throw new Error(`Invalid SSH connection string: ${ssh}`)
  }

  const username = parts[0]!
  const hostPort = parts[1]!

  const [host, portStr] = hostPort.split(':')
  const port = portStr ? parseInt(portStr, 10) : 22

  if (!host) {
    throw new Error(`Invalid SSH host: ${ssh}`)
  }

  return { host, port, username }
}

/**
 * Create a tar archive of the build context
 */
function createBuildContextTar(buildContext: string): Readable {
  return tar.pack(path.resolve(buildContext))
}

/**
 * Build a Docker image on a remote host via SSH
 */
export async function buildImageViaSSH(
  options: SSHBuildOptions,
): Promise<void> {
  const {
    ssh,
    dockerfile,
    buildContext,
    imageName,
    buildArgs,
    tags,
    privateKey,
    password,
    noCache,
  } = options
  const connection = parseSSHConnection(ssh)

  return new Promise((resolve, reject) => {
    const conn = new Client()

    conn.on('ready', () => {
      // Create tar archive of build context
      const tarStream = createBuildContextTar(buildContext)

      // Build the docker build command
      const buildArgsStr = buildArgs
        ? Object.entries(buildArgs)
            .map(
              ([key, value]) => `--build-arg ${key}=${JSON.stringify(value)}`,
            )
            .join(' ')
        : ''

      const tagsStr =
        tags && tags.length > 0
          ? tags.map((t) => `-t ${t}`).join(' ')
          : `-t ${imageName}`
      const dockerfilePath = path.relative(
        buildContext,
        path.resolve(buildContext, dockerfile),
      )
      const noCacheFlag = noCache ? '--no-cache' : ''

      // Transfer tar to remote host
      conn.sftp((err, sftp) => {
        if (err) {
          reject(err)
          return
        }

        const remoteTarPath = `/tmp/docker-build-${Date.now()}.tar`
        const remoteContextPath = `/tmp/docker-build-context-${Date.now()}`

        // Write tar to remote
        const writeStream = sftp.createWriteStream(remoteTarPath)
        tarStream.pipe(writeStream)

        writeStream.on('close', () => {
          // Extract tar on remote
          conn.exec(
            `mkdir -p ${remoteContextPath} && cd ${remoteContextPath} && tar -xf ${remoteTarPath} && rm ${remoteTarPath}`,
            (err, stream) => {
              if (err) {
                reject(err)
                return
              }

              stream.on('close', (code: unknown) => {
                if (code !== 0) {
                  reject(
                    new Error(
                      `Failed to extract build context: exit code ${code}`,
                    ),
                  )
                  return
                }

                // Build the image
                const buildCmd = `cd ${remoteContextPath} && docker build ${noCacheFlag} ${buildArgsStr} ${tagsStr} -f ${dockerfilePath} .`
                conn.exec(buildCmd, (err, stream) => {
                  if (err) {
                    reject(err)
                    return
                  }

                  stream.on('data', (chunk: Buffer) => {
                    process.stdout.write(chunk)
                  })

                  stream.stderr.on('data', (chunk: Buffer) => {
                    process.stderr.write(chunk)
                  })

                  stream.on('close', (code: unknown) => {
                    // Cleanup
                    conn.exec(`rm -rf ${remoteContextPath}`, () => {
                      conn.end()
                    })

                    if (code === 0) {
                      resolve()
                    } else {
                      reject(
                        new Error(`Docker build failed with exit code ${code}`),
                      )
                    }
                  })
                })
              })

              stream.stderr.on('data', (chunk: Buffer) => {
                process.stderr.write(chunk)
              })
            },
          )
        })

        writeStream.on('error', (err: unknown) => {
          reject(err)
        })
      })
    })

    conn.on('error', (err) => {
      reject(err)
    })

    // Connect
    const connectOptions: any = {
      host: connection.host,
      port: connection.port,
      username: connection.username,
    }

    if (privateKey) {
      connectOptions.privateKey = privateKey
    } else if (password) {
      connectOptions.password = password
    } else {
      // Try to use default SSH key
      connectOptions.readyTimeout = 20000
    }

    conn.connect(connectOptions)
  })
}
