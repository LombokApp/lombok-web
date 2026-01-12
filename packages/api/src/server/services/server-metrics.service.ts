import { StorageProvisionDTO } from '@lombokapp/types'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { and, eq, gte, isNotNull, isNull, sql } from 'drizzle-orm'
import { appsTable } from 'src/app/entities/app.entity'
import { sessionsTable } from 'src/auth/entities/session.entity'
import { eventsTable } from 'src/event/entities/event.entity'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { folderObjectsTable } from 'src/folders/entities/folder-object.entity'
import { OrmService } from 'src/orm/orm.service'
import { storageLocationsTable } from 'src/storage/entities/storage-location.entity'
import { tasksTable } from 'src/task/entities/task.entity'
import type { User } from 'src/users/entities/user.entity'
import { usersTable } from 'src/users/entities/user.entity'

import { ServerConfigurationService } from './server-configuration.service'

function generateStorageProvisionsSummary(
  allUserStorageProvisions: StorageProvisionDTO[],
): string {
  const displayMax = 2
  return allUserStorageProvisions
    .slice(0, displayMax)
    .map((provision) => provision.label)
    .concat(
      allUserStorageProvisions.length > displayMax
        ? [` and ${allUserStorageProvisions.length - displayMax} more`]
        : [],
    )
    .join(', ')
}

function generateInstalledAppsSummary(
  installedApps: { identifier: string; label: string }[],
): string {
  return installedApps.map((app) => app.label).join(', ')
}

@Injectable()
export class ServerMetricsService {
  constructor(
    private readonly ormService: OrmService,
    private readonly serverConfigurationService: ServerConfigurationService,
  ) {}

  async getServerMetrics(actor: User) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    // Calculate date for "last week"
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    // Get total users
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const totalUsersResult = (
      await this.ormService.db
        .select({ count: sql<string>`count(*)::text` })
        .from(usersTable)
    )[0]!
    // Get new users in last week
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const usersPreviousWeekResult = (
      await this.ormService.db
        .select({ count: sql<string>`count(*)::text` })
        .from(usersTable)
        .where(gte(usersTable.createdAt, oneWeekAgo))
    )[0]!

    // Get new sessions in last week
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const sessionsCreatedPreviousWeekResult = (
      await this.ormService.db
        .select({ count: sql<string>`count(*)::text` })
        .from(sessionsTable)
        .where(gte(sessionsTable.createdAt, oneWeekAgo))
    )[0]!

    // Get new sessions in last 24 hours
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const sessionsCreatedPrevious24HoursResult = (
      await this.ormService.db
        .select({ count: sql<string>`count(*)::text` })
        .from(sessionsTable)
        .where(gte(sessionsTable.createdAt, oneDayAgo))
    )[0]!

    // Get total folders
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const totalFoldersResult = (
      await this.ormService.db
        .select({ count: sql<string>`count(*)::text` })
        .from(foldersTable)
    )[0]!

    // Get new folders in last week
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const foldersCreatedLastWeekResult = (
      await this.ormService.db
        .select({ count: sql<string>`count(*)::text` })
        .from(foldersTable)
        .where(gte(foldersTable.createdAt, oneWeekAgo))
    )[0]!

    // Get installed apps count
    const installedAppsResult = await this.ormService.db
      .select({
        identifier: appsTable.identifier,
        label: appsTable.label,
        totalCount: sql<string>`count(*) over ()::text`,
      })
      .from(appsTable)
    // Get total indexed size (sum of all folderObject.sizeBytes)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const totalIndexedSizeResult = (
      await this.ormService.db
        .select({
          totalSize: sql<string>`coalesce(sum(${folderObjectsTable.sizeBytes}), 0)::text`,
        })
        .from(folderObjectsTable)
    )[0]!

    // Task metrics
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)

    // Get tasks created in the last day
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const tasksCreatedPreviousDayResult = (
      await this.ormService.db
        .select({ count: sql<string>`count(*)::text` })
        .from(tasksTable)
        .where(gte(tasksTable.createdAt, oneDayAgo))
    )[0]!

    // Get tasks created in the last hour
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const tasksCreatedPreviousHourResult = (
      await this.ormService.db
        .select({ count: sql<string>`count(*)::text` })
        .from(tasksTable)
        .where(gte(tasksTable.createdAt, oneHourAgo))
    )[0]!

    // Get task errors in the last day
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const taskErrorsPreviousDayResult = (
      await this.ormService.db
        .select({ count: sql<string>`count(*)::text` })
        .from(tasksTable)
        .where(
          and(
            eq(tasksTable.success, false),
            gte(tasksTable.completedAt, oneDayAgo),
          ),
        )
    )[0]!

    // Get task errors in the last hour
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const taskErrorsPreviousHourResult = (
      await this.ormService.db
        .select({ count: sql<string>`count(*)::text` })
        .from(tasksTable)
        .where(
          and(
            eq(tasksTable.success, false),
            gte(tasksTable.completedAt, oneHourAgo),
          ),
        )
    )[0]!

    // Get server events (targetLocation.folderId is null) emitted in the last day
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const serverEventsEmittedPreviousDayResult = (
      await this.ormService.db
        .select({ count: sql<string>`count(*)::text` })
        .from(eventsTable)
        .where(
          and(
            gte(eventsTable.createdAt, oneDayAgo),
            isNull(eventsTable.targetLocationFolderId),
          ),
        )
    )[0]!

    // Get server events (targetLocation.folderId is null) emitted in the last hour
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const serverEventsEmittedPreviousHourResult = (
      await this.ormService.db
        .select({ count: sql<string>`count(*)::text` })
        .from(eventsTable)
        .where(
          and(
            gte(eventsTable.createdAt, oneHourAgo),
            isNull(eventsTable.targetLocationFolderId),
          ),
        )
    )[0]!

    // Get folder events (targetLocation.folderId is not null) emitted in the last day
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const folderEventsEmittedPreviousDayResult = (
      await this.ormService.db
        .select({ count: sql<string>`count(*)::text` })
        .from(eventsTable)
        .where(
          and(
            gte(eventsTable.createdAt, oneDayAgo),
            isNotNull(eventsTable.targetLocationFolderId),
          ),
        )
    )[0]!

    // Get folder events (targetLocation.folderId is not null) emitted in the last hour
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const folderEventsEmittedPreviousHourResult = (
      await this.ormService.db
        .select({ count: sql<string>`count(*)::text` })
        .from(eventsTable)
        .where(
          and(
            gte(eventsTable.createdAt, oneHourAgo),
            isNotNull(eventsTable.targetLocationFolderId),
          ),
        )
    )[0]!

    // Get count of user storage provisions (count of storage locations with providerType = 'SERVER')
    const allStorageProvisions =
      await this.serverConfigurationService.listStorageProvisionsAsUser(actor)

    // Get total persisted size (sum of folderObject.sizeBytes for all folders)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const totalIndexedAcrossStorageProvisionsResult = (
      await this.ormService.db
        .select({
          totalSize: sql<string>`coalesce(sum(${folderObjectsTable.sizeBytes}), 0)::text`,
        })
        .from(folderObjectsTable)
        .innerJoin(
          foldersTable,
          eq(folderObjectsTable.folderId, foldersTable.id),
        )
        .innerJoin(
          storageLocationsTable,
          eq(foldersTable.contentLocationId, storageLocationsTable.id),
        )
        .where(eq(storageLocationsTable.providerType, 'SERVER'))
    )[0]!

    return {
      totalUsers: BigInt(totalUsersResult.count),
      sessionsCreatedPreviousWeek: BigInt(
        sessionsCreatedPreviousWeekResult.count,
      ),
      sessionsCreatedPrevious24Hours: BigInt(
        sessionsCreatedPrevious24HoursResult.count,
      ),
      usersCreatedPreviousWeek: BigInt(usersPreviousWeekResult.count),
      totalFolders: BigInt(totalFoldersResult.count),
      foldersCreatedPreviousWeek: BigInt(foldersCreatedLastWeekResult.count),
      totalIndexedSizeBytes: BigInt(totalIndexedSizeResult.totalSize),
      provisionedStorage: {
        totalCount: BigInt(allStorageProvisions.length),
        summary: generateStorageProvisionsSummary(allStorageProvisions),
      },
      totalStorageProvisions: BigInt(allStorageProvisions.length),
      totalIndexedSizeBytesAcrossStorageProvisions: BigInt(
        totalIndexedAcrossStorageProvisionsResult.totalSize,
      ),
      installedApps: {
        totalCount:
          installedAppsResult[0]?.totalCount !== undefined
            ? BigInt(installedAppsResult[0].totalCount)
            : BigInt(0),
        summary: generateInstalledAppsSummary(installedAppsResult),
      },
      // Task metrics
      tasksCreatedPreviousDay: BigInt(tasksCreatedPreviousDayResult.count),
      tasksCreatedPreviousHour: BigInt(tasksCreatedPreviousHourResult.count),
      taskErrorsPreviousDay: BigInt(taskErrorsPreviousDayResult.count),
      taskErrorsPreviousHour: BigInt(taskErrorsPreviousHourResult.count),
      // Event metrics
      serverEventsEmittedPreviousDay: BigInt(
        serverEventsEmittedPreviousDayResult.count,
      ),
      serverEventsEmittedPreviousHour: BigInt(
        serverEventsEmittedPreviousHourResult.count,
      ),
      folderEventsEmittedPreviousDay: BigInt(
        folderEventsEmittedPreviousDayResult.count,
      ),
      folderEventsEmittedPreviousHour: BigInt(
        folderEventsEmittedPreviousHourResult.count,
      ),
    }
  }
}
