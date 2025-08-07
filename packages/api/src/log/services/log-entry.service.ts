import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { and, count, eq, ilike, inArray, or, SQL } from 'drizzle-orm'
import { FolderService } from 'src/folders/services/folder.service'
import { OrmService } from 'src/orm/orm.service'
import { normalizeSortParam, parseSort } from 'src/platform/utils/sort.util'
import { User } from 'src/users/entities/user.entity'
import { v4 as uuidV4 } from 'uuid'

import type { LogEntry, NewLogEntry } from '../entities/log-entry.entity'
import { logEntriesTable, LogEntryLevel } from '../entities/log-entry.entity'

export enum LogSort {
  CreatedAtAsc = 'createdAt-asc',
  CreatedAtDesc = 'createdAt-desc',
  MessageAsc = 'message-asc',
  MessageDesc = 'message-desc',
  EmitterIdentifierAsc = 'emitterIdentifier-asc',
  EmitterIdentifierDesc = 'emitterIdentifier-desc',
  LevelAsc = 'level-asc',
  LevelDesc = 'level-desc',
}

@Injectable()
export class LogEntryService {
  private readonly logger = new Logger(LogEntryService.name)

  constructor(
    private readonly ormService: OrmService,
    private readonly folderService: FolderService,
  ) {}

  async emitLog({
    emitterIdentifier,
    logMessage,
    data,
    level = LogEntryLevel.INFO,
    subjectContext,
  }: {
    emitterIdentifier: string
    logMessage: string
    data: unknown
    level: LogEntryLevel
    subjectContext?: { folderId: string; objectKey?: string }
  }) {
    const now = new Date()

    await this.ormService.db.transaction(async (db) => {
      const logEntry: NewLogEntry = {
        id: uuidV4(),
        emitterIdentifier,
        level,
        subjectFolderId: subjectContext?.folderId,
        subjectObjectKey: subjectContext?.objectKey,
        createdAt: now,
        message: logMessage,
        data,
      }
      await db.insert(logEntriesTable).values([logEntry])
    })
  }

  async getFolderLogAsUser(
    actor: User,
    { folderId, logId }: { folderId: string; logId: string },
  ): Promise<LogEntry & { folder?: { name: string; ownerId: string } }> {
    const { folder } = await this.folderService.getFolderAsUser(actor, folderId)

    const logEntry = await this.ormService.db.query.logEntriesTable.findFirst({
      where: and(
        eq(logEntriesTable.subjectFolderId, folder.id),
        eq(logEntriesTable.id, logId),
      ),
      with: {
        folder: true,
      },
    })

    if (!logEntry) {
      throw new NotFoundException()
    }

    return {
      ...logEntry,
      folder: logEntry.folder
        ? { name: logEntry.folder.name, ownerId: logEntry.folder.ownerId }
        : undefined,
    } as LogEntry & { folder?: { name: string; ownerId: string } }
  }

  async listFolderLogsAsUser(
    actor: User,
    { folderId }: { folderId: string },
    queryParams: {
      search?: string
      offset?: number
      limit?: number
      sort?: LogSort[]
    },
  ) {
    const { folder } = await this.folderService.getFolderAsUser(actor, folderId)
    return this.listLogs({ ...queryParams, folderId: folder.id })
  }

  async getLogAsAdmin(
    actor: User,
    logId: string,
  ): Promise<LogEntry & { folder?: { name: string; ownerId: string } }> {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    const logEntry = await this.ormService.db.query.logEntriesTable.findFirst({
      where: eq(logEntriesTable.id, logId),
      with: {
        folder: true,
      },
    })
    if (!logEntry) {
      throw new NotFoundException()
    }
    return {
      ...logEntry,
      folder: logEntry.folder
        ? { name: logEntry.folder.name, ownerId: logEntry.folder.ownerId }
        : undefined,
    } as LogEntry & { folder?: { name: string; ownerId: string } }
  }

  async listLogsAsAdmin(
    actor: User,
    {
      offset,
      limit,
      sort = [LogSort.CreatedAtDesc],
      search,
      folderId,
      objectKey,
      includeDebug,
      includeError,
      includeInfo,
      includeTrace,
      includeWarning,
    }: {
      folderId?: string
      objectKey?: string
      search?: string
      offset?: number
      limit?: number
      sort?: LogSort[]
      includeTrace?: 'true'
      includeDebug?: 'true'
      includeInfo?: 'true'
      includeWarning?: 'true'
      includeError?: 'true'
    },
  ): Promise<{
    meta: { totalCount: number }
    result: (LogEntry & { folder?: { name: string; ownerId: string } })[]
  }> {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    return this.listLogs({
      offset,
      limit,
      sort,
      search,
      folderId,
      objectKey,
      includeDebug,
      includeError,
      includeTrace,
      includeWarning,
      includeInfo,
    })
  }

  async listLogs({
    offset,
    limit,
    search,
    sort = [LogSort.CreatedAtAsc],
    objectKey,
    folderId,
    includeDebug,
    includeError,
    includeInfo,
    includeTrace,
    includeWarning,
  }: {
    folderId?: string
    objectKey?: string
    search?: string
    offset?: number
    limit?: number
    sort?: LogSort[]
    includeTrace?: 'true'
    includeDebug?: 'true'
    includeInfo?: 'true'
    includeWarning?: 'true'
    includeError?: 'true'
  }): Promise<{
    meta: { totalCount: number }
    result: (LogEntry & { folder?: { name: string; ownerId: string } })[]
  }> {
    const conditions: (SQL | undefined)[] = []
    if (folderId) {
      conditions.push(eq(logEntriesTable.subjectFolderId, folderId))
    }

    const levelFilters: LogEntryLevel[] = []
    if (includeDebug) {
      levelFilters.push(LogEntryLevel.DEBUG)
    }
    if (includeTrace) {
      levelFilters.push(LogEntryLevel.TRACE)
    }
    if (includeInfo) {
      levelFilters.push(LogEntryLevel.INFO)
    }
    if (includeWarning) {
      levelFilters.push(LogEntryLevel.WARN)
    }
    if (includeError) {
      levelFilters.push(LogEntryLevel.ERROR)
    }
    if (search) {
      conditions.push(
        or(
          ilike(logEntriesTable.message, `%${search}%`),
          ilike(logEntriesTable.emitterIdentifier, `%${search}%`),
        ),
      )
    }

    if (levelFilters.length) {
      conditions.push(inArray(logEntriesTable.level, levelFilters))
    }

    if (objectKey) {
      conditions.push(eq(logEntriesTable.subjectObjectKey, objectKey))
    }

    const logEntries = await this.ormService.db.query.logEntriesTable.findMany({
      ...(conditions.length ? { where: and(...conditions) } : {}),
      offset: Math.max(0, offset ?? 0),
      limit: Math.min(100, limit ?? 25),
      orderBy: parseSort(
        logEntriesTable,
        normalizeSortParam(sort) ?? [LogSort.CreatedAtAsc],
      ),
      with: {
        folder: true,
      },
    })

    const logEntriesCountResult = await this.ormService.db
      .select({
        count: count(),
      })
      .from(logEntriesTable)
      .where(conditions.length ? and(...conditions) : undefined)

    return {
      result: logEntries.map((logEntry) => ({
        ...logEntry,
        folder: logEntry.folder
          ? { name: logEntry.folder.name, ownerId: logEntry.folder.ownerId }
          : undefined,
      })) as (LogEntry & { folder?: { name: string; ownerId: string } })[],
      meta: { totalCount: logEntriesCountResult[0].count },
    }
  }
}
