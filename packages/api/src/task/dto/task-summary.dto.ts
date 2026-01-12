import { createZodDto } from '@anatine/zod-nestjs'
import {
  elaboratedTargetLocationContextDTOSchema,
  storageAccessPolicySchema,
  targetLocationContextDTOSchema,
  taskInvocationSchema,
} from '@lombokapp/types'
import { z } from 'zod'

export const taskSummaryDTOSchema = z.object({
  id: z.string().uuid(),
  taskIdentifier: z.string(),
  ownerIdentifier: z.string(),
  invocation: taskInvocationSchema,
  success: z.boolean().optional(),
  handlerIdentifier: z.string().optional(),
  targetLocation: targetLocationContextDTOSchema.optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
  taskDescription: z.string(),
  storageAccessPolicy: storageAccessPolicySchema.optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const taskSummaryWithTargetLocationContextDTOSchema =
  taskSummaryDTOSchema.extend({
    targetLocationContext: elaboratedTargetLocationContextDTOSchema.optional(),
  })

export class TaskSummaryDTO extends createZodDto(taskSummaryDTOSchema) {}
export class TaskSummaryWithTargetLocationContextDTO extends createZodDto(
  taskSummaryWithTargetLocationContextDTOSchema,
) {}
