import type { paths } from '@lombokapp/types'

export type DockerHostsConfigResponse =
  paths['/api/v1/server/docker-hosts']['get']['responses']['200']['content']['application/json']
export type DockerHostConfigSummary = DockerHostsConfigResponse['hosts'][number]

export type DockerHostsStateResponse =
  paths['/api/v1/server/docker-hosts/state']['get']['responses']['200']['content']['application/json']
export type DockerHostState = DockerHostsStateResponse['hosts'][number]
export type DockerHostConnectionState = DockerHostState['connection']
export type DockerHostContainerState = DockerHostState['containers'][number]

export type DockerContainerStatsResponse =
  paths['/api/v1/server/docker-hosts/{hostId}/containers/{containerId}/stats']['get']['responses']['200']['content']['application/json']
export type DockerContainerStats = DockerContainerStatsResponse['stats']

export type DockerContainerInspectResponse =
  paths['/api/v1/server/docker-hosts/{hostId}/containers/{containerId}/inspect']['get']['responses']['200']['content']['application/json']
export type DockerContainerGpuInfo = DockerContainerInspectResponse['gpuInfo']

export type DockerContainerJobsResponse =
  paths['/api/v1/server/docker-hosts/{hostId}/containers/{containerId}/jobs']['get']['responses']['200']['content']['application/json']
export type DockerContainerJobSummary = DockerContainerJobsResponse['jobs'][number]

export type DockerContainerJobDetailResponse =
  paths['/api/v1/server/docker-hosts/{hostId}/containers/{containerId}/jobs/{jobId}']['get']['responses']['200']['content']['application/json']
