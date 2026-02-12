import {
  elaboratedTargetLocationContextDTOSchema,
  storageAccessPolicySchema,
  targetLocationContextDTOSchema,
  taskInvocationSchema,
} from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const taskSummaryDTOSchema = z.object({
  id: z.guid(),
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
  startedAt: z.iso.datetime().optional(),
  completedAt: z.iso.datetime().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export const taskSummaryWithTargetLocationContextDTOSchema =
  taskSummaryDTOSchema.extend({
    targetLocationContext: elaboratedTargetLocationContextDTOSchema.optional(),
  })

export class TaskSummaryDTO extends createZodDto(taskSummaryDTOSchema) {}
export class TaskSummaryWithTargetLocationContextDTO extends createZodDto(
  taskSummaryWithTargetLocationContextDTOSchema,
) {}
