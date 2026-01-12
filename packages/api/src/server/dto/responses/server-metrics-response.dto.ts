import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const serverMetricsResponseSchema = z.object({
  totalUsers: z.bigint(),
  totalFolders: z.bigint(),
  usersCreatedPreviousWeek: z.bigint(),
  foldersCreatedPreviousWeek: z.bigint(),
  totalIndexedSizeBytes: z.bigint(),
  sessionsCreatedPreviousWeek: z.bigint(),
  sessionsCreatedPrevious24Hours: z.bigint(),
  provisionedStorage: z.object({
    totalCount: z.bigint(),
    summary: z.string(),
  }),
  totalIndexedSizeBytesAcrossStorageProvisions: z.bigint(),
  installedApps: z.object({
    totalCount: z.bigint(),
    summary: z.string(),
  }),
  // Task metrics
  tasksCreatedPreviousDay: z.bigint(),
  tasksCreatedPreviousHour: z.bigint(),
  taskErrorsPreviousDay: z.bigint(),
  taskErrorsPreviousHour: z.bigint(),
  // Event metrics
  serverEventsEmittedPreviousDay: z.bigint(),
  serverEventsEmittedPreviousHour: z.bigint(),
  folderEventsEmittedPreviousDay: z.bigint(),
  folderEventsEmittedPreviousHour: z.bigint(),
})

export class ServerMetricsResponse extends createZodDto(
  serverMetricsResponseSchema,
) {}
