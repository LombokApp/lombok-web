import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const triggerAppTaskInputSchema = z.object({
  objectKey: z.string().optional(),
  inputParams: z.any().optional(),
})

export class TriggerAppTaskInputDTO extends createZodDto(
  triggerAppTaskInputSchema,
) {}
