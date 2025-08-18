import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const serverMetricsResponseSchema = z.object({
  totalUsers: z.number(),
  totalFolders: z.number(),
  usersCreatedPreviousWeek: z.number(),
  foldersCreatedPreviousWeek: z.number(),
  totalIndexedSizeBytes: z.number(),
  sessionsCreatedPreviousWeek: z.number(),
  sessionsCreatedPrevious24Hours: z.number(),
  provisionedStorage: z.object({
    totalCount: z.number(),
    summary: z.string(),
  }),
  totalIndexedSizeBytesAcrossStorageProvisions: z.number(),
  installedApps: z.object({
    totalCount: z.number(),
    summary: z.string(),
  }),
  // Task metrics
  tasksCreatedPreviousDay: z.number(),
  tasksCreatedPreviousHour: z.number(),
  taskErrorsPreviousDay: z.number(),
  taskErrorsPreviousHour: z.number(),
  // Event metrics
  serverEventsEmittedPreviousDay: z.number(),
  serverEventsEmittedPreviousHour: z.number(),
  folderEventsEmittedPreviousDay: z.number(),
  folderEventsEmittedPreviousHour: z.number(),
})

export class ServerMetricsResponse extends createZodDto(
  serverMetricsResponseSchema,
) {}
