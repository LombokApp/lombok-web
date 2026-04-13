import type { DockerHost } from '../../entities/docker-host.entity'
import type { DockerProfileResourceAssignment } from '../../entities/docker-profile-resource-assignment.entity'
import type { DockerRegistryCredential } from '../../entities/docker-registry-credential.entity'
import type { DockerResourceConfigRow } from '../../entities/docker-resource-config.entity'
import type { DockerStandaloneContainer } from '../../entities/docker-standalone-container.entity'
import type {
  DockerHostDTO,
  DockerProfileResourceAssignmentDTO,
  DockerRegistryCredentialDTO,
  DockerResourceConfigDTO,
  DockerStandaloneContainerDTO,
} from '../responses/docker-host-management-responses.dto'

export function transformDockerHostToDTO(host: DockerHost): DockerHostDTO {
  return {
    id: host.id,
    identifier: host.identifier,
    label: host.label,
    type: host.type,
    host: host.host,
    tlsConfig: host.tlsConfig,
    isDefault: host.isDefault,
    enabled: host.enabled,
    healthStatus: host.healthStatus,
    lastHealthCheck: host.lastHealthCheck?.toISOString() ?? null,
    createdAt: host.createdAt.toISOString(),
    updatedAt: host.updatedAt.toISOString(),
  }
}

export function transformDockerRegistryCredentialToDTO(
  cred: DockerRegistryCredential,
): DockerRegistryCredentialDTO {
  return {
    id: cred.id,
    registry: cred.registry,
    serverAddress: cred.serverAddress,
    username: cred.username,
    password: cred.password,
    createdAt: cred.createdAt.toISOString(),
    updatedAt: cred.updatedAt.toISOString(),
  }
}

export function transformDockerResourceConfigToDTO(
  config: DockerResourceConfigRow,
): DockerResourceConfigDTO {
  return {
    id: config.id,
    dockerHostId: config.dockerHostId,
    label: config.label,
    config: config.config,
    configHashes: config.configHashes,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  }
}

export function transformDockerProfileAssignmentToDTO(
  assignment: DockerProfileResourceAssignment,
): DockerProfileResourceAssignmentDTO {
  return {
    id: assignment.id,
    dockerResourceConfigId: assignment.dockerResourceConfigId,
    appIdentifier: assignment.appIdentifier,
    profileKey: assignment.profileKey,
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  }
}

export function transformDockerStandaloneContainerToDTO(
  container: DockerStandaloneContainer,
): DockerStandaloneContainerDTO {
  return {
    id: container.id,
    dockerResourceConfigId: container.dockerResourceConfigId,
    label: container.label,
    image: container.image,
    tag: container.tag,
    desiredStatus: container.desiredStatus,
    containerId: container.containerId,
    ports: container.ports,
    createdAt: container.createdAt.toISOString(),
    updatedAt: container.updatedAt.toISOString(),
  }
}
