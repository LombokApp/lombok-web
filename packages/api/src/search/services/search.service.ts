import type {
  AppSearchResults,
  MediaType,
  SearchResultItem,
  SearchResults,
} from '@lombokapp/types'
import { Injectable, Logger } from '@nestjs/common'
import {
  and,
  AnyColumn,
  asc,
  desc,
  eq,
  inArray,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'
import { AppService } from 'src/app/services/app.service'
import { transformFolderObjectToDTO } from 'src/folders/dto/transforms/folder-object.transforms'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { folderObjectsTable } from 'src/folders/entities/folder-object.entity'
import { folderSharesTable } from 'src/folders/entities/folder-share.entity'
import { FolderNotFoundException } from 'src/folders/exceptions/folder-not-found.exception'
import { FolderObjectNotFoundException } from 'src/folders/exceptions/folder-object-not-found.exception'
import { FolderService } from 'src/folders/services/folder.service'
import { OrmService } from 'src/orm/orm.service'
import type { SearchConfigDTO } from 'src/server/dto/search-config.dto'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import type { User } from 'src/users/entities/user.entity'

export enum SearchSort {
  RelevanceDesc = 'relevance-desc',
  NameAsc = 'name-asc',
  NameDesc = 'name-desc',
  SizeAsc = 'sizeBytes-asc',
  SizeDesc = 'sizeBytes-desc',
  DateModifiedAsc = 'lastModified-asc',
  DateModifiedDesc = 'lastModified-desc',
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name)

  constructor(
    private readonly appService: AppService,
    private readonly serverConfigurationService: ServerConfigurationService,
    private readonly folderService: FolderService,
    private readonly ormService: OrmService,
  ) {}

  async listSearchResultsAsUser(
    actor: User,
    query: string,
    options?: {
      global?: boolean
      offset?: number
      limit?: number
      sort?: SearchSort[]
      mediaType?: MediaType[]
    },
  ): Promise<{ result: SearchResults; meta: { totalCount: number } }> {
    const searchConfig = await this.serverConfigurationService.getSearchConfig()

    if (!searchConfig.app) {
      return this.coreSearchResults({
        query,
        userId: actor.id,
        offset: options?.offset,
        limit: options?.limit,
        sort: options?.sort,
        mediaType: options?.mediaType,
      })
    }

    // Validate config at runtime
    const validation = await this.validateSearchConfigAtRuntime(searchConfig)
    if (!validation.valid) {
      this.logger.warn(
        'Search config validation failed, falling back to core search',
        {
          reason: validation.reason,
          appIdentifier: searchConfig.app.identifier,
          workerIdentifier: searchConfig.app.workerIdentifier,
        },
      )
      // Fall back to core search
      return this.coreSearchResults({
        query,
        userId: actor.id,
        offset: options?.offset,
        limit: options?.limit,
        sort: options?.sort,
        mediaType: options?.mediaType,
      })
    }

    const searchResults = await this.appService.getSearchResultsFromAppAsUser(
      actor,
      {
        appIdentifier: searchConfig.app.identifier,
        workerIdentifier: searchConfig.app.workerIdentifier,
        query,
      },
    )

    const hydratedResults = await this.hydrateSearchResultsAsUser(
      actor,
      searchResults,
    )

    return {
      result: hydratedResults,
      meta: { totalCount: searchResults.length },
    }
  }

  private async validateSearchConfigAtRuntime(
    searchConfig: SearchConfigDTO,
  ): Promise<{ valid: boolean; reason?: string }> {
    if (!searchConfig.app) {
      return { valid: true }
    }

    const { identifier, workerIdentifier } = searchConfig.app

    try {
      const app = await this.appService.getApp(identifier)

      if (!app) {
        return { valid: false, reason: 'App not found' }
      }

      if (!app.enabled) {
        return { valid: false, reason: 'App disabled' }
      }

      if (!app.config.runtimeWorkers?.[workerIdentifier]) {
        return { valid: false, reason: 'Worker not found' }
      }

      const performSearchWorkers =
        app.config.systemRequestRuntimeWorkers?.performSearch ?? []
      if (!performSearchWorkers.includes(workerIdentifier)) {
        return { valid: false, reason: 'Worker not authorized' }
      }

      return { valid: true }
    } catch {
      return { valid: false, reason: 'Validation error' }
    }
  }

  async coreSearchResults({
    query,
    userId,
    offset = 0,
    limit = 25,
    sort = [SearchSort.RelevanceDesc],
    mediaType,
  }: {
    query: string
    userId: string
    offset?: number
    limit?: number
    sort?: SearchSort[]
    mediaType?: MediaType[]
  }): Promise<{ result: SearchResults; meta: { totalCount: number } }> {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return { result: [], meta: { totalCount: 0 } }
    }

    // Sanitize query for PostgreSQL tsquery
    const sanitizedQuery = trimmedQuery.replace(/[&|!():<>]/g, ' ')
    const tsquery = sanitizedQuery.split(/\s+/).filter(Boolean).join(' & ')

    // Build WHERE conditions
    const conditions: (SQL | undefined)[] = []

    // For trigram matching, we use a lower threshold to be more permissive
    // The similarity threshold of 0.1 means we'll match even weak similarities
    // and let the scoring determine relevance
    const trigramCondition = sql`extensions.word_similarity(${trimmedQuery}, ${folderObjectsTable.filename}) > 0.1`

    // Combine full-text search OR trigram similarity
    // This allows matches even if full-text search doesn't find exact tokens
    if (tsquery) {
      conditions.push(
        or(
          sql`${folderObjectsTable.searchVector} @@ to_tsquery('english', ${tsquery})`,
          trigramCondition,
        ),
      )
    } else {
      conditions.push(trigramCondition)
    }

    // Media type filter
    if (mediaType && mediaType.length > 0) {
      conditions.push(inArray(folderObjectsTable.mediaType, mediaType))
    }

    // Permission filter: user owns folder OR has share access
    conditions.push(
      or(
        eq(foldersTable.ownerId, userId),
        eq(folderSharesTable.userId, userId),
      ),
    )

    const where = and(...conditions.filter(Boolean))

    // Calculate combined score:
    // - Full-text search score (ts_rank_cd): weighted at 0.15 (secondary)
    // - Trigram similarity on filename (word_similarity): weighted at 0.85 (primary)
    // Heavily favor trigram for intuitive substring matching like "wifi" in "vueling-wifi.pdf"
    const tsRankScore = tsquery
      ? sql<number>`ts_rank_cd(${folderObjectsTable.searchVector}, to_tsquery('english', ${tsquery}))`
      : sql<number>`0`

    const trigramScore = sql<number>`extensions.word_similarity(${trimmedQuery}, ${folderObjectsTable.filename})`

    // Combined weighted score: heavily prioritize trigram for filename matching
    const scoreExpression = sql<number>`(
      COALESCE(${tsRankScore}, 0) * 0.15 +
      COALESCE(${trigramScore}, 0) * 0.85
    )`

    // Get the global max score for consistent normalization across pages
    const [maxScoreResult] = await this.ormService.db
      .select({ maxScore: sql<number>`MAX(${scoreExpression})` })
      .from(folderObjectsTable)
      .innerJoin(foldersTable, eq(folderObjectsTable.folderId, foldersTable.id))
      .leftJoin(
        folderSharesTable,
        eq(folderSharesTable.folderId, foldersTable.id),
      )
      .where(where)
      .groupBy(
        folderObjectsTable.id,
        folderObjectsTable.objectKey,
        folderObjectsTable.folderId,
        folderObjectsTable.searchVector,
        folderObjectsTable.filename,
      )

    const globalMaxScore = Math.max(maxScoreResult?.maxScore ?? 1, 1)

    // Execute main query with LIMIT/OFFSET
    // Use GROUP BY instead of SELECT DISTINCT to avoid ORDER BY issues with computed expressions
    const results = await this.ormService.db
      .select({
        id: folderObjectsTable.id,
        objectKey: folderObjectsTable.objectKey,
        folderId: folderObjectsTable.folderId,
        score: scoreExpression,
      })
      .from(folderObjectsTable)
      .innerJoin(foldersTable, eq(folderObjectsTable.folderId, foldersTable.id))
      .leftJoin(
        folderSharesTable,
        eq(folderSharesTable.folderId, foldersTable.id),
      )
      .where(where)
      .groupBy(
        folderObjectsTable.id,
        folderObjectsTable.objectKey,
        folderObjectsTable.folderId,
        folderObjectsTable.searchVector,
        folderObjectsTable.filename,
      )
      .orderBy(
        ...(sort[0] === SearchSort.RelevanceDesc
          ? [desc(scoreExpression)]
          : sort.map((sortField) => {
              const [field, dir] = sortField.split('-') as [
                string,
                'asc' | 'desc',
              ]

              const columnMap: Record<string, AnyColumn> = {
                name: folderObjectsTable.filename,
                sizeBytes: folderObjectsTable.sizeBytes,
                lastModified: folderObjectsTable.lastModified,
              }

              const column = columnMap[field]
              if (!column) {
                return asc(folderObjectsTable.filename)
              }

              return dir === 'asc' ? asc(column) : desc(column)
            })),
      )
      .limit(Math.min(100, limit))
      .offset(Math.max(0, offset))

    // Get total count with deduplication
    const [countResult] = await this.ormService.db
      .select({ count: sql<string>`count(DISTINCT ${folderObjectsTable.id})` })
      .from(folderObjectsTable)
      .innerJoin(foldersTable, eq(folderObjectsTable.folderId, foldersTable.id))
      .leftJoin(
        folderSharesTable,
        eq(folderSharesTable.folderId, foldersTable.id),
      )
      .where(where)

    // Normalize scores to 0-1 range using global max (consistent across all pages)
    const appSearchResults: AppSearchResults = results.map((r) => ({
      folderId: r.folderId,
      objectKey: r.objectKey,
      similarity: Math.min(1, r.score / globalMaxScore),
      score: r.score,
    }))

    const hydratedResults = await this.hydrateSearchResultsAsUser(
      { id: userId } as User,
      appSearchResults,
    )

    return {
      result: hydratedResults,
      meta: { totalCount: Number(countResult?.count ?? 0) },
    }
  }

  private async hydrateSearchResultsAsUser(
    actor: User,
    searchResults: AppSearchResults,
  ): Promise<SearchResults> {
    if (searchResults.length === 0) {
      return []
    }

    const folderIds = [
      ...new Set(searchResults.map((result) => result.folderId)),
    ]
    const folderAccessResults = await Promise.allSettled(
      folderIds.map((folderId) =>
        this.folderService.getFolderAsUser(actor, folderId),
      ),
    )

    const accessibleFolders = new Map<string, string>()
    folderAccessResults.forEach((result, index) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const folderId = folderIds[index]!
      if (result.status === 'fulfilled') {
        accessibleFolders.set(folderId, result.value.folder.name)
        return
      }
      if (result.reason instanceof FolderNotFoundException) {
        return
      }
      throw result.reason
    })

    if (accessibleFolders.size === 0) {
      return []
    }

    type FolderObjectLookup = Awaited<
      ReturnType<FolderService['getFolderObject']>
    >
    const objectFetchCache = new Map<
      string,
      Promise<FolderObjectLookup | null>
    >()
    const getFolderObject = (folderId: string, objectKey: string) => {
      const cacheKey = `${folderId}:${objectKey}`
      if (!objectFetchCache.has(cacheKey)) {
        objectFetchCache.set(
          cacheKey,
          this.folderService
            .getFolderObject({ folderId, objectKey })
            .catch((error) => {
              if (error instanceof FolderObjectNotFoundException) {
                return null
              }
              throw error
            }),
        )
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return objectFetchCache.get(cacheKey)!
    }

    const hydratedResults = await Promise.all(
      searchResults.map(async (result) => {
        const folderName = accessibleFolders.get(result.folderId)
        if (!folderName) {
          return null
        }
        const folderObject = await getFolderObject(
          result.folderId,
          result.objectKey,
        )
        if (!folderObject) {
          return null
        }
        return {
          ...result,
          folderName,
          folderObject: transformFolderObjectToDTO(folderObject),
        }
      }),
    )

    return hydratedResults.filter(
      (result): result is SearchResultItem => result !== null,
    )
  }
}
