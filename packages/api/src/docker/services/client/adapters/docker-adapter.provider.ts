import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { coreConfig } from 'src/core/config/core.config'

import { DockerAdapter } from '../docker-client.types'
import { LocalDockerAdapter } from './local.adapter'

export interface IDockerAdapterProvider {
  getDockerAdapter: (hostId: string) => DockerAdapter
}

@Injectable({ scope: Scope.DEFAULT })
export class DockerAdapterProvider implements IDockerAdapterProvider {
  private readonly adapterCache = new Map<string, DockerAdapter>()

  constructor(
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestjsConfig.ConfigType<typeof coreConfig>,
  ) {}

  getDockerAdapter(hostId: string): DockerAdapter {
    const cached = this.adapterCache.get(hostId)
    if (cached) {
      return cached
    }

    const hostConfig = this._coreConfig.dockerHostConfig.hosts?.[hostId]
    if (!hostConfig) {
      throw new NotFoundException(
        `Docker host config not found for host: ${hostId}`,
      )
    }
    const hostType = hostConfig.type as string

    if (hostType === 'docker_endpoint') {
      const adapter = new LocalDockerAdapter(hostConfig.host, {
        // dockerEndpointAuth: this._coreConfig.dockerHostConfig.hosts?.[hostId]?.auth,
        dockerRegistryAuth: this._coreConfig.dockerHostConfig.registryAuth,
      })
      this.adapterCache.set(hostId, adapter)
      return adapter
    }

    throw new Error(
      `Docker host config typ "${hostType}" not supported for host: ${hostId}`,
    )
  }
}
