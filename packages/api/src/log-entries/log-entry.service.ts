import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { eq, sql } from 'drizzle-orm'
import {
  logEntriesTable,
  LogEntry,
} from 'src/log-entries/entities/log-entry.entity'
import { OrmService } from 'src/orm/orm.service'
import { User } from 'src/users/entities/user.entity'

@Injectable()
export class LogEntryService {
  constructor(private readonly ormService: OrmService) {}

  async getLogEntryAsAdmin(actor: User, logEntryId: string): Promise<LogEntry> {
    const logEntry = await this.ormService.db.query.logEntriesTable.findFirst({
      where: eq(logEntriesTable.id, logEntryId),
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
  ): Promise<{ meta: { totalCount: number }; result: LogEntry[] }> {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    const logEntries: LogEntry[] =
      await this.ormService.db.query.logEntriesTable.findMany({
        offset: offset ?? 0,
        limit: limit ?? 25,
      })
    const [logEntriesCount] = await this.ormService.db
      .select({ count: sql<string | null>`count(*)` })
      .from(logEntriesTable)

    return {
      result: logEntries,
      meta: { totalCount: parseInt(logEntriesCount.count ?? '0', 10) },
    }
  }
}
