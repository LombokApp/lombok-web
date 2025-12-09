import { StorageProvisionDTO } from '@lombokapp/types'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { and, eq, sql } from 'drizzle-orm'
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
    const totalUsersResult = await this.ormService.db
      .select({ count: sql<string>`count(*)` })
      .from(usersTable)

    // Get new users in last week
    const usersPreviousWeekResult = await this.ormService.db
      .select({ count: sql<string>`count(*)` })
      .from(usersTable)
      .where(
        sql`${usersTable.createdAt} >= ${oneWeekAgo.toISOString()}::timestamp`,
      )

    // Get new sessions in last week
    const sessionsCreatedPreviousWeekResult = await this.ormService.db
      .select({ count: sql<string>`count(*)` })
      .from(sessionsTable)
      .where(
        sql`${sessionsTable.createdAt} >= ${oneWeekAgo.toISOString()}::timestamp`,
      )

    // Get new sessions in last 24 hours
    const sessionsCreatedPrevious24HoursResult = await this.ormService.db
      .select({ count: sql<string>`count(*)` })
      .from(sessionsTable)
      .where(
        sql`${sessionsTable.createdAt} >= ${oneDayAgo.toISOString()}::timestamp`,
      )

    // Get total folders
    const totalFoldersResult = await this.ormService.db
      .select({ count: sql<string>`count(*)` })
      .from(foldersTable)

    // Get new folders in last week
    const foldersCreatedLastWeekResult = await this.ormService.db
      .select({ count: sql<string>`count(*)` })
      .from(foldersTable)
      .where(
        sql`${foldersTable.createdAt} >= ${oneWeekAgo.toISOString()}::timestamp`,
      )

    // Get installed apps count
    const installedAppsResult = await this.ormService.db
      .select({
        identifier: appsTable.identifier,
        label: appsTable.label,
        totalCount: sql<string>`count(*) over()`,
      })
      .from(appsTable)

    // Get total indexed size (sum of all folderObject.sizeBytes)
    const totalIndexedSizeResult = await this.ormService.db
      .select({
        totalSize: sql<string>`coalesce(sum(${folderObjectsTable.sizeBytes}), 0)`,
      })
      .from(folderObjectsTable)

    // Task metrics
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)

    // Get tasks created in the last day
    const tasksCreatedPreviousDayResult = await this.ormService.db
      .select({ count: sql<string>`count(*)` })
      .from(tasksTable)
      .where(
        sql`${tasksTable.createdAt} >= ${oneDayAgo.toISOString()}::timestamp`,
      )

    // Get tasks created in the last hour
    const tasksCreatedPreviousHourResult = await this.ormService.db
      .select({ count: sql<string>`count(*)` })
      .from(tasksTable)
      .where(
        sql`${tasksTable.createdAt} >= ${oneHourAgo.toISOString()}::timestamp`,
      )

    // Get task errors in the last day
    const taskErrorsPreviousDayResult = await this.ormService.db
      .select({ count: sql<string>`count(*)` })
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.success, false),
          sql`${tasksTable.completedAt} >= ${oneDayAgo.toISOString()}::timestamp`,
        ),
      )

    // Get task errors in the last hour
    const taskErrorsPreviousHourResult = await this.ormService.db
      .select({ count: sql<string>`count(*)` })
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.success, false),
          sql`${tasksTable.completedAt} >= ${oneHourAgo.toISOString()}::timestamp`,
        ),
      )

    // Event metrics
    const eventFolderId = sql<string>`(${eventsTable.targetLocation} ->> 'folderId')::uuid`

    // Get server events (targetLocation.folderId is null) emitted in the last day
    const serverEventsEmittedPreviousDayResult = await this.ormService.db
      .select({ count: sql<string>`count(*)` })
      .from(eventsTable)
      .where(
        sql`${eventsTable.createdAt} >= ${oneDayAgo.toISOString()}::timestamp AND ${eventFolderId} IS NULL`,
      )

    // Get server events (targetLocation.folderId is null) emitted in the last hour
    const serverEventsEmittedPreviousHourResult = await this.ormService.db
      .select({ count: sql<string>`count(*)` })
      .from(eventsTable)
      .where(
        sql`${eventsTable.createdAt} >= ${oneHourAgo.toISOString()}::timestamp AND ${eventFolderId} IS NULL`,
      )

    // Get folder events (targetLocation.folderId is not null) emitted in the last day
    const folderEventsEmittedPreviousDayResult = await this.ormService.db
      .select({ count: sql<string>`count(*)` })
      .from(eventsTable)
      .where(
        sql`${eventsTable.createdAt} >= ${oneDayAgo.toISOString()}::timestamp AND ${eventFolderId} IS NOT NULL`,
      )

    // Get folder events (targetLocation.folderId is not null) emitted in the last hour
    const folderEventsEmittedPreviousHourResult = await this.ormService.db
      .select({ count: sql<string>`count(*)` })
      .from(eventsTable)
      .where(
        sql`${eventsTable.createdAt} >= ${oneHourAgo.toISOString()}::timestamp AND ${eventFolderId} IS NOT NULL`,
      )

    // Get count of user storage provisions (count of storage locations with providerType = 'SERVER')
    const allStorageProvisions =
      await this.serverConfigurationService.listStorageProvisionsAsUser(actor)

    // Get total persisted size (sum of folderObject.sizeBytes for all folders)
    const totalIndexedAcrossStorageProvisionsResult = await this.ormService.db
      .select({
        totalSize: sql<string>`coalesce(sum(${folderObjectsTable.sizeBytes}), 0)`,
      })
      .from(folderObjectsTable)
      .innerJoin(foldersTable, eq(folderObjectsTable.folderId, foldersTable.id))
      .innerJoin(
        storageLocationsTable,
        eq(foldersTable.contentLocationId, storageLocationsTable.id),
      )
      .where(eq(storageLocationsTable.providerType, 'SERVER'))

    return {
      totalUsers: parseInt(totalUsersResult[0]?.count ?? '0', 10),
      sessionsCreatedPreviousWeek: parseInt(
        sessionsCreatedPreviousWeekResult[0]?.count ?? '0',
        10,
      ),
      sessionsCreatedPrevious24Hours: parseInt(
        sessionsCreatedPrevious24HoursResult[0]?.count ?? '0',
        10,
      ),
      usersCreatedPreviousWeek: parseInt(
        usersPreviousWeekResult[0]?.count ?? '0',
        10,
      ),
      totalFolders: parseInt(totalFoldersResult[0]?.count ?? '0', 10),
      foldersCreatedPreviousWeek: parseInt(
        foldersCreatedLastWeekResult[0]?.count ?? '0',
        10,
      ),
      totalIndexedSizeBytes: parseInt(
        totalIndexedSizeResult[0]?.totalSize ?? '0',
        10,
      ),
      provisionedStorage: {
        totalCount: allStorageProvisions.length,
        summary: generateStorageProvisionsSummary(allStorageProvisions),
      },
      totalStorageProvisions: allStorageProvisions.length,
      totalIndexedSizeBytesAcrossStorageProvisions: parseInt(
        totalIndexedAcrossStorageProvisionsResult[0]?.totalSize ?? '0',
        10,
      ),
      installedApps: {
        totalCount: parseInt(installedAppsResult[0]?.totalCount ?? '0', 10),
        summary: generateInstalledAppsSummary(installedAppsResult),
      },
      // Task metrics
      tasksCreatedPreviousDay: parseInt(
        tasksCreatedPreviousDayResult[0]?.count ?? '0',
        10,
      ),
      tasksCreatedPreviousHour: parseInt(
        tasksCreatedPreviousHourResult[0]?.count ?? '0',
        10,
      ),
      taskErrorsPreviousDay: parseInt(
        taskErrorsPreviousDayResult[0]?.count ?? '0',
        10,
      ),
      taskErrorsPreviousHour: parseInt(
        taskErrorsPreviousHourResult[0]?.count ?? '0',
        10,
      ),
      // Event metrics
      serverEventsEmittedPreviousDay: parseInt(
        serverEventsEmittedPreviousDayResult[0]?.count ?? '0',
        10,
      ),
      serverEventsEmittedPreviousHour: parseInt(
        serverEventsEmittedPreviousHourResult[0]?.count ?? '0',
        10,
      ),
      folderEventsEmittedPreviousDay: parseInt(
        folderEventsEmittedPreviousDayResult[0]?.count ?? '0',
        10,
      ),
      folderEventsEmittedPreviousHour: parseInt(
        folderEventsEmittedPreviousHourResult[0]?.count ?? '0',
        10,
      ),
    }
  }
}
