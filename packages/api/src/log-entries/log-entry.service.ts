import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { eq, sql } from 'drizzle-orm'
import {
  appLogEntriesTable,
  AppLogEntry,
} from 'src/app/entities/app-log-entry.entity'
import { OrmService } from 'src/orm/orm.service'
import { User } from 'src/users/entities/user.entity'

@Injectable()
export class LogEntryService {
  constructor(private readonly ormService: OrmService) {}

  async getLogEntryAsAdmin(
    actor: User,
    logEntryId: string,
  ): Promise<AppLogEntry> {
    const logEntry =
      await this.ormService.db.query.appLogEntriesTable.findFirst({
        where: eq(appLogEntriesTable.id, logEntryId),
      })
    if (!logEntry) {
      throw new NotFoundException()
    }
    return logEntry
  }

  async listLogEntriesAsAdmin(
    actor: User,
    {
      offset,
      limit,
    }: {
      offset?: number
      limit?: number
    },
  ): Promise<{ meta: { totalCount: number }; result: AppLogEntry[] }> {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    const logEntries: AppLogEntry[] =
      await this.ormService.db.query.appLogEntriesTable.findMany({
        offset: offset ?? 0,
        limit: limit ?? 25,
      })
    const [appLogEntriesCount] = await this.ormService.db
      .select({ count: sql<string | null>`count(*)` })
      .from(appLogEntriesTable)

    return {
      result: logEntries,
      meta: { totalCount: parseInt(appLogEntriesCount.count ?? '0', 10) },
    }
  }
}
