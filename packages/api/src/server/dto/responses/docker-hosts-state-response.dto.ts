import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const dockerHostConnectionSchema = z.object({
  success: z.boolean(),
  version: z.string().optional(),
  apiVersion: z.string().optional(),
  error: z.string().optional(),
})

export const dockerHostContainerStateSchema = z.object({
  id: z.string(),
  image: z.string(),
  labels: z.record(z.string(), z.string()),
  state: z.enum(['running', 'exited', 'paused', 'created', 'unknown']),
  createdAt: z.string(),
  profileId: z.string().optional(),
  profileHash: z.string().optional(),
})

export const dockerHostResourcesSchema = z.object({
  cpuCores: z.number().int().nonnegative().optional(),
  memoryBytes: z.number().int().nonnegative().optional(),
})

export const dockerHostStateSchema = z.object({
  id: z.string(),
  description: z.string(),
  connection: dockerHostConnectionSchema,
  resources: dockerHostResourcesSchema.optional(),
  containers: z.array(dockerHostContainerStateSchema),
  containersError: z.string().optional(),
})

export const dockerHostsStateResponseSchema = z.object({
  hosts: z.array(dockerHostStateSchema),
})

export class DockerHostsStateResponse extends createZodDto(
  dockerHostsStateResponseSchema,
) {}
