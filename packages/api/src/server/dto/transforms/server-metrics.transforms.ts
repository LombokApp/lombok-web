import type { ServerMetricsService } from 'src/server/services/server-metrics.service'
import type { z } from 'zod'

import type { serverMetricsResponseSchema } from '../responses/server-metrics-response.dto'

type ServerMetricsServiceResponse = Awaited<
  ReturnType<InstanceType<typeof ServerMetricsService>['getServerMetrics']>
>

export function transformServerMetricsToDTO(
  metrics: ServerMetricsServiceResponse,
): z.infer<typeof serverMetricsResponseSchema> {
  return {
    totalUsers: metrics.totalUsers.toString(),
    totalFolders: metrics.totalFolders.toString(),
    usersCreatedPreviousWeek: metrics.usersCreatedPreviousWeek.toString(),
    foldersCreatedPreviousWeek: metrics.foldersCreatedPreviousWeek.toString(),
    totalIndexedSizeBytes: metrics.totalIndexedSizeBytes.toString(),
    sessionsCreatedPreviousWeek: metrics.sessionsCreatedPreviousWeek.toString(),
    sessionsCreatedPrevious24Hours:
      metrics.sessionsCreatedPrevious24Hours.toString(),
    provisionedStorage: {
      totalCount: metrics.provisionedStorage.totalCount.toString(),
      summary: metrics.provisionedStorage.summary,
    },
    totalIndexedSizeBytesAcrossStorageProvisions:
      metrics.totalIndexedSizeBytesAcrossStorageProvisions.toString(),
    installedApps: {
      totalCount: metrics.installedApps.totalCount.toString(),
      summary: metrics.installedApps.summary,
    },
    // Task metrics
    tasksCreatedPreviousDay: metrics.tasksCreatedPreviousDay.toString(),
    tasksCreatedPreviousHour: metrics.tasksCreatedPreviousHour.toString(),
    taskErrorsPreviousDay: metrics.taskErrorsPreviousDay.toString(),
    taskErrorsPreviousHour: metrics.taskErrorsPreviousHour.toString(),
    // Event metrics
    serverEventsEmittedPreviousDay:
      metrics.serverEventsEmittedPreviousDay.toString(),
    serverEventsEmittedPreviousHour:
      metrics.serverEventsEmittedPreviousHour.toString(),
    folderEventsEmittedPreviousDay:
      metrics.folderEventsEmittedPreviousDay.toString(),
    folderEventsEmittedPreviousHour:
      metrics.folderEventsEmittedPreviousHour.toString(),
  }
}
