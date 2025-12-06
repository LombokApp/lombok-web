import { Inject, Injectable, Scope } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { platformConfig } from 'src/platform/config/platform.config'

import { DockerAdapter } from '../docker-client.types'
import { LocalDockerAdapter } from './local.adapter'

export interface IDockerAdapterProvider {
  getDockerAdapter: (hostId: string) => DockerAdapter
}

@Injectable({ scope: Scope.DEFAULT })
export class DockerAdapterProvider implements IDockerAdapterProvider {
  constructor(
    @Inject(platformConfig.KEY)
    private readonly _platformConfig: nestjsConfig.ConfigType<
      typeof platformConfig
    >,
  ) {}

  getDockerAdapter(hostId: string): DockerAdapter {
    const hostConfig =
      hostId in this._platformConfig.dockerHostConfig &&
      this._platformConfig.dockerHostConfig[hostId]
    if (!hostConfig) {
      throw new Error(`Docker host config not found for host: ${hostId}`)
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
