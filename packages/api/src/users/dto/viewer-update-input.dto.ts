import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const viewerUpdateInputSchema = z.object({
  name: z.string(),
})

export class ViewerUpdateInputDTO extends createZodDto(
  viewerUpdateInputSchema,
) {}
