import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const activityMetricsQuerySchema = z.object({
  metric: z.enum(['events', 'tasks', 'task_duration', 'logs']),
  range: z.enum(['24h', '7d', '30d', '90d']).default('7d'),
  granularity: z.enum(['hour', 'day']).optional(),
  groupBy: z.enum(['none', 'app', 'type']).default('none'),
  appId: z.string().optional(),
})

export class ActivityMetricsQueryDTO extends createZodDto(
  activityMetricsQuerySchema,
) {}
