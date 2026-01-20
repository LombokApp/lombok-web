import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

const dockerHostGpuSchema = z.object({
  driver: z.string(),
  deviceIds: z.array(z.string()),
})

export const dockerHostConfigSummarySchema = z.object({
  id: z.string(),
  host: z.string(),
  type: z.enum(['docker_endpoint']),
  assignedProfiles: z.array(z.string()),
  networkMode: z.record(z.string(), z.string()).optional(),
  gpus: z.record(z.string(), dockerHostGpuSchema).optional(),
  volumes: z.record(z.string(), z.array(z.string())).optional(),
  extraHosts: z.record(z.string(), z.array(z.string())).optional(),
  environmentVariableKeys: z.record(z.string(), z.array(z.string())).optional(),
})

export const dockerHostsConfigResponseSchema = z.object({
  profileHostAssignments: z.record(z.string(), z.string()).optional(),
  hosts: z.array(dockerHostConfigSummarySchema),
})

export class DockerHostsConfigResponse extends createZodDto(
  dockerHostsConfigResponseSchema,
) {}
