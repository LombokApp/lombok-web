import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const activityMetricsResponseSchema = z.object({
  metric: z.string(),
  granularity: z.enum(['hour', 'day']),
  from: z.string(),
  to: z.string(),
  series: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      points: z.array(
        z.object({
          bucket: z.string(),
          value: z.number(),
        }),
      ),
    }),
  ),
})

export class ActivityMetricsResponse extends createZodDto(
  activityMetricsResponseSchema,
) {}
