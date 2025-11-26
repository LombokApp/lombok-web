import { AppAPIError } from '@lombokapp/app-worker-sdk'

import type {
  DockerAdapter,
  DockerRunConfig,
} from '../run-docker-image/docker-manager.types'
import {
  type DockerEndpointAuth,
  DockerEndpointAuthType,
} from '../schemas/docker-endpoint-authentication.schema'

export class LocalDockerAdapter implements DockerAdapter {
  constructor(
    private readonly dockerHost: string,
    private readonly dockerEndpointAuth?: DockerEndpointAuth,
  ) {}

  async run(runConfig: DockerRunConfig): Promise<void> {
    // Determine if dockerHost is HTTP/HTTPS or a Unix socket path
    const isHttpEndpoint = /^https?:\/\//i.test(this.dockerHost)
    const baseUrl = isHttpEndpoint ? this.dockerHost : `unix:${this.dockerHost}`

    // Build headers with authentication if provided
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (this.dockerEndpointAuth) {
      if (
        this.dockerEndpointAuth.authenticationType ===
        DockerEndpointAuthType.Basic
      ) {
        const credentials = `${this.dockerEndpointAuth.username}:${this.dockerEndpointAuth.password}`
        const encodedCredentials = Buffer.from(credentials).toString('base64')
        headers['Authorization'] = `Basic ${encodedCredentials}`
      } else if (
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        this.dockerEndpointAuth.authenticationType ===
        DockerEndpointAuthType.Bearer
      ) {
        headers['Authorization'] = `Bearer ${this.dockerEndpointAuth.apiKey}`
      }
    }

    // Prepare container configuration
    const containerConfig: {
      Image: string
      Cmd?: string[]
      Env?: string[]
    } = {
      Image: runConfig.image,
    }

    if (runConfig.command) {
      containerConfig.Cmd = runConfig.command
    }

    if (runConfig.environmentVariables) {
      containerConfig.Env = Object.entries(runConfig.environmentVariables).map(
        ([key, value]) => `${key}=${value}`,
      )
    }

    // Create container
    const createUrl = isHttpEndpoint
      ? `${baseUrl}/v1.43/containers/create`
      : `${baseUrl}:/v1.43/containers/create`

    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(containerConfig),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      throw new AppAPIError(
        'DOCKER_CREATE_CONTAINER_ERROR',
        `Failed to create container: ${createResponse.status} ${createResponse.statusText}. ${errorText}`,
      )
    }

    const createResult = (await createResponse.json()) as { Id: string }
    const containerId = createResult.Id

    // Start container
    const startUrl = isHttpEndpoint
      ? `${baseUrl}/v1.43/containers/${containerId}/start`
      : `${baseUrl}:/v1.43/containers/${containerId}/start`

    const startResponse = await fetch(startUrl, {
      method: 'POST',
      headers,
    })

    if (!startResponse.ok) {
      const errorText = await startResponse.text()
      throw new AppAPIError(
        'DOCKER_START_CONTAINER_ERROR',
        `Failed to start container: ${startResponse.status} ${startResponse.statusText}. ${errorText}`,
      )
    }
  }
}
