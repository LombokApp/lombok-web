import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const serverMetricsResponseSchema = z.object({
  totalUsers: z.string(),
  totalFolders: z.string(),
  usersCreatedPreviousWeek: z.string(),
  foldersCreatedPreviousWeek: z.string(),
  totalIndexedSizeBytes: z.string(),
  sessionsCreatedPreviousWeek: z.string(),
  sessionsCreatedPrevious24Hours: z.string(),
  provisionedStorage: z.object({
    totalCount: z.string(),
    summary: z.string(),
  }),
  totalIndexedSizeBytesAcrossStorageProvisions: z.string(),
  installedApps: z.object({
    totalCount: z.string(),
    summary: z.string(),
  }),
  // Task metrics
  tasksCreatedPreviousDay: z.string(),
  tasksCreatedPreviousHour: z.string(),
  taskErrorsPreviousDay: z.string(),
  taskErrorsPreviousHour: z.string(),
  // Event metrics
  serverEventsEmittedPreviousDay: z.string(),
  serverEventsEmittedPreviousHour: z.string(),
  folderEventsEmittedPreviousDay: z.string(),
  folderEventsEmittedPreviousHour: z.string(),
})

export class ServerMetricsResponse extends createZodDto(
  serverMetricsResponseSchema,
) {}
