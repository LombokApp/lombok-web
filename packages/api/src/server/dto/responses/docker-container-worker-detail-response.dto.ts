import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { dockerContainerJobSummarySchema } from './docker-container-jobs-response.dto'

export const dockerContainerWorkerDetailResponseSchema = z.object({
  workerState: z.unknown().optional(),
  workerStateError: z.string().optional(),
  jobs: z.array(dockerContainerJobSummarySchema),
  jobsError: z.string().optional(),
})

export class DockerContainerWorkerDetailResponse extends createZodDto(
  dockerContainerWorkerDetailResponseSchema,
) {}
