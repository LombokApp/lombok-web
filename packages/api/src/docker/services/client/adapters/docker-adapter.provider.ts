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
  constructor(
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestjsConfig.ConfigType<typeof coreConfig>,
  ) {}

  getDockerAdapter(hostId: string): DockerAdapter {
    const hostConfig = this._coreConfig.dockerHostConfig.hosts?.[hostId]
    if (!hostConfig) {
      throw new NotFoundException(
        `Docker host config not found for host: ${hostId}`,
      )
    }
    const hostType = hostConfig.type as string

    if (hostType === 'docker_endpoint') {
      return new LocalDockerAdapter(hostConfig.host)
    }

    throw new Error(
      `Docker host config typ "${hostType}" not supported for host: ${hostId}`,
    )
  }
}
