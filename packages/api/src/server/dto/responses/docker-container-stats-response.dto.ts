import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const dockerContainerStatsSchema = z.object({
  cpuPercent: z.number().optional(),
  memoryBytes: z.number().optional(),
  memoryLimitBytes: z.number().optional(),
  memoryPercent: z.number().optional(),
})

export const dockerContainerStatsResponseSchema = z.object({
  stats: dockerContainerStatsSchema,
})

export class DockerContainerStatsResponse extends createZodDto(
  dockerContainerStatsResponseSchema,
) {}
