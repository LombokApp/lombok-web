import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { dockerResourceConfigDataSchema } from '../docker-resource-config-input.dto'

// ─── Shared schemas ────────────────────────────────────────────────────────

const successResponseSchema = z.object({
  success: z.literal(true),
})

// ─── Docker Host ───────────────────────────────────────────────────────────

export const dockerHostDTOSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  label: z.string(),
  type: z.enum(['docker_endpoint']),
  host: z.string(),
  tlsConfig: z
    .object({
      ca: z.string().optional(),
      cert: z.string().optional(),
      key: z.string().optional(),
    })
    .nullable(),
  isDefault: z.boolean(),
  enabled: z.boolean(),
  healthStatus: z.enum(['healthy', 'unhealthy', 'unknown']),
  lastHealthCheck: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type DockerHostDTO = z.infer<typeof dockerHostDTOSchema>

export class DockerHostListResponse extends createZodDto(
  z.object({ result: z.array(dockerHostDTOSchema) }),
) {}

export class DockerHostResponse extends createZodDto(
  z.object({ result: dockerHostDTOSchema }),
) {}

export class DockerHostDeleteResponse extends createZodDto(
  successResponseSchema,
) {}

// ─── Registry Credential ──────────────────────────────────────────────────

export const dockerRegistryCredentialDTOSchema = z.object({
  id: z.string(),
  registry: z.string(),
  serverAddress: z.string(),
  username: z.string(),
  password: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type DockerRegistryCredentialDTO = z.infer<
  typeof dockerRegistryCredentialDTOSchema
>

export class DockerRegistryCredentialListResponse extends createZodDto(
  z.object({ result: z.array(dockerRegistryCredentialDTOSchema) }),
) {}

export class DockerRegistryCredentialResponse extends createZodDto(
  z.object({ result: dockerRegistryCredentialDTOSchema }),
) {}

export class DockerRegistryCredentialDeleteResponse extends createZodDto(
  successResponseSchema,
) {}

// ─── Resource Config ──────────────────────────────────────────────────────

export const dockerResourceConfigDTOSchema = z.object({
  id: z.string(),
  dockerHostId: z.string(),
  label: z.string(),
  config: dockerResourceConfigDataSchema,
  configHashes: z.record(z.string(), z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type DockerResourceConfigDTO = z.infer<
  typeof dockerResourceConfigDTOSchema
>

export class DockerResourceConfigListResponse extends createZodDto(
  z.object({ result: z.array(dockerResourceConfigDTOSchema) }),
) {}

export class DockerResourceConfigResponse extends createZodDto(
  z.object({ result: dockerResourceConfigDTOSchema }),
) {}

export class DockerResourceConfigSimilarResponse extends createZodDto(
  z.object({
    result: z.record(
      z.string(),
      z.array(z.object({ configId: z.string(), label: z.string() })),
    ),
  }),
) {}

export class DockerResourceConfigDeleteResponse extends createZodDto(
  successResponseSchema,
) {}

// ─── Profile Resource Assignment ──────────────────────────────────────────

export const dockerProfileResourceAssignmentDTOSchema = z.object({
  id: z.string(),
  dockerResourceConfigId: z.string(),
  appIdentifier: z.string(),
  profileKey: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type DockerProfileResourceAssignmentDTO = z.infer<
  typeof dockerProfileResourceAssignmentDTOSchema
>

export class DockerProfileAssignmentListResponse extends createZodDto(
  z.object({ result: z.array(dockerProfileResourceAssignmentDTOSchema) }),
) {}

export class DockerProfileAssignmentResponse extends createZodDto(
  z.object({ result: dockerProfileResourceAssignmentDTOSchema }),
) {}

export class DockerProfileAssignmentDeleteResponse extends createZodDto(
  successResponseSchema,
) {}

export class DockerProfileResolveResponse extends createZodDto(
  z.object({
    result: z.object({
      hostId: z.string(),
      hostIdentifier: z.string(),
      hostLabel: z.string(),
      hostEndpoint: z.string(),
      resourceConfig: dockerResourceConfigDataSchema.nullable(),
    }),
  }),
) {}

// ─── Standalone Container ─────────────────────────────────────────────────

export const dockerStandaloneContainerDTOSchema = z.object({
  id: z.string(),
  dockerResourceConfigId: z.string(),
  label: z.string(),
  image: z.string(),
  tag: z.string(),
  desiredStatus: z.enum(['running', 'stopped']),
  containerId: z.string().nullable(),
  ports: z.array(
    z.object({
      host: z.number(),
      container: z.number(),
      protocol: z.enum(['tcp', 'udp']),
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type DockerStandaloneContainerDTO = z.infer<
  typeof dockerStandaloneContainerDTOSchema
>

export class DockerStandaloneContainerListResponse extends createZodDto(
  z.object({ result: z.array(dockerStandaloneContainerDTOSchema) }),
) {}

export class DockerStandaloneContainerResponse extends createZodDto(
  z.object({ result: dockerStandaloneContainerDTOSchema }),
) {}

export class DockerStandaloneContainerDeleteResponse extends createZodDto(
  successResponseSchema,
) {}
