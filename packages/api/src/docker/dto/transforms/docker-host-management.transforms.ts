import type { DockerHost } from '../../entities/docker-host.entity'
import type { DockerProfileResourceAssignment } from '../../entities/docker-profile-resource-assignment.entity'
import type { DockerRegistryCredential } from '../../entities/docker-registry-credential.entity'
import type { DockerStandaloneContainer } from '../../entities/docker-standalone-container.entity'
import type {
  DockerHostDTO,
  DockerProfileResourceAssignmentDTO,
  DockerRegistryCredentialDTO,
  DockerStandaloneContainerDTO,
} from '../responses/docker-host-management-responses.dto'

export function transformDockerHostToDTO(host: DockerHost): DockerHostDTO {
  return {
    id: host.id,
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

export function transformDockerProfileAssignmentToDTO(
  assignment: DockerProfileResourceAssignment,
): DockerProfileResourceAssignmentDTO {
  return {
    id: assignment.id,
    appIdentifier: assignment.appIdentifier,
    profileKey: assignment.profileKey,
    dockerHostId: assignment.dockerHostId,
    config: assignment.config,
    configHashes: assignment.configHashes,
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  }
}

export function transformDockerStandaloneContainerToDTO(
  container: DockerStandaloneContainer,
): DockerStandaloneContainerDTO {
  return {
    id: container.id,
    dockerHostId: container.dockerHostId,
    label: container.label,
    image: container.image,
    tag: container.tag,
    desiredStatus: container.desiredStatus,
    containerId: container.containerId,
    config: container.config,
    configHashes: container.configHashes,
    createdAt: container.createdAt.toISOString(),
    updatedAt: container.updatedAt.toISOString(),
  }
}
