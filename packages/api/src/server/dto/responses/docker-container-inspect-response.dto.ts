import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const dockerContainerGpuInfoSchema = z.object({
  driver: z.string().optional(),
  command: z.string().optional(),
  output: z.string().optional(),
  error: z.string().optional(),
})

export const dockerContainerInspectResponseSchema = z.object({
  inspect: z.unknown(),
  gpuInfo: dockerContainerGpuInfoSchema.optional(),
})

export class DockerContainerInspectResponse extends createZodDto(
  dockerContainerInspectResponseSchema,
) {}
