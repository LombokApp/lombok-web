import { CoreEvent } from '@lombokapp/types'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import {
  and,
  eq,
  gte,
  inArray,
  isNotNull,
  lt,
  type SQL,
  sql,
} from 'drizzle-orm'
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core'
import { eventsTable } from 'src/event/entities/event.entity'
import { logEntriesTable } from 'src/log/entities/log-entry.entity'
import { OrmService } from 'src/orm/orm.service'
import { tasksTable } from 'src/task/entities/task.entity'
import type { User } from 'src/users/entities/user.entity'

export type ActivityMetric = 'events' | 'tasks' | 'task_duration' | 'logs'
export type ActivityRange = '24h' | '7d' | '30d' | '90d'
export type ActivityGranularity = 'hour' | 'day'
/** `app` partitions by emitter/owner; `type` by event identifier / log level. */
export type ActivityGroupBy = 'none' | 'app' | 'type'

export interface ActivityMetricPoint {
  bucket: string
  value: number
}
export interface ActivityMetricSeries {
  key: string
  label: string
  points: ActivityMetricPoint[]
}
export interface ActivityTimeseries {
  metric: ActivityMetric
  granularity: ActivityGranularity
  from: string
  to: string
  series: ActivityMetricSeries[]
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const TASK_OUTCOME_IDENTIFIERS = [
  CoreEvent.task_completed,
  CoreEvent.task_failed,
]
/** Default retention window for synthetic task telemetry events. */
export const TASK_TELEMETRY_RETENTION_DAYS = 90

const RANGE_CONFIG: Record<
  ActivityRange,
  { ms: number; granularity: ActivityGranularity }
> = {
  '24h': { ms: DAY_MS, granularity: 'hour' },
  '7d': { ms: 7 * DAY_MS, granularity: 'day' },
  '30d': { ms: 30 * DAY_MS, granularity: 'day' },
  '90d': { ms: 90 * DAY_MS, granularity: 'day' },
}

// node-postgres maps int4/round-to-int back to JS numbers.
const COUNT_EXPR = sql<number>`count(*)::int`
const DIM_ALL = sql<string>`'all'`

interface BucketRow {
  bucket: string
  dim: string
  value: number
}

/** Resolve the grouping dimension for a given groupBy. */
function dimFor(
  groupBy: ActivityGroupBy,
  appColumn: AnyPgColumn,
  typeColumn: AnyPgColumn,
): SQL<string> {
  if (groupBy === 'app') {
    return sql<string>`${appColumn}`
  }
  if (groupBy === 'type') {
    return sql<string>`${typeColumn}`
  }
  return DIM_ALL
}

/** UTC, calendar-aligned `date_trunc` rendered as a stable ISO string. */
function bucketExpr(
  column: AnyPgColumn,
  granularity: ActivityGranularity,
): SQL<string> {
  return sql<string>`to_char(date_trunc(${granularity}, ${column} AT TIME ZONE 'UTC'), ${'YYYY-MM-DD"T"HH24:MI:SS"Z"'})`
}

export function floorToBucket(
  date: Date,
  granularity: ActivityGranularity,
): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      granularity === 'hour' ? date.getUTCHours() : 0,
    ),
  )
}

function formatBucket(date: Date, granularity: ActivityGranularity): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const ymd = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
  const hh = granularity === 'hour' ? pad(date.getUTCHours()) : '00'
  return `${ymd}T${hh}:00:00Z`
}

export function enumerateBuckets(
  from: Date,
  toBucket: Date,
  granularity: ActivityGranularity,
): string[] {
  const step = granularity === 'hour' ? HOUR_MS : DAY_MS
  const out: string[] = []
  // Guard against pathological ranges (max ~2200 hourly points / ~90 days).
  for (
    let t = from.getTime();
    t <= toBucket.getTime() && out.length < 2200;
    t += step
  ) {
    out.push(formatBucket(new Date(t), granularity))
  }
  return out
}

/** Pivot flat (bucket, dim, value) rows into zero-filled per-dimension series. */
export function shapeSeries(
  rows: { bucket: string; dim: string; value: number }[],
  buckets: string[],
  groupBy: ActivityGroupBy,
): ActivityMetricSeries[] {
  const byDim = new Map<string, Map<string, number>>()
  for (const row of rows) {
    const series = byDim.get(row.dim) ?? new Map<string, number>()
    series.set(row.bucket, row.value)
    byDim.set(row.dim, series)
  }

  // Ungrouped metrics always render a single continuous series, even when empty.
  if (groupBy === 'none' && byDim.size === 0) {
    byDim.set('all', new Map())
  }

  return [...byDim.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dim, values]) => ({
      key: dim,
      label: dim,
      points: buckets.map((bucket) => ({
        bucket,
        value: values.get(bucket) ?? 0,
      })),
    }))
}

@Injectable()
export class ActivityMetricsService {
  constructor(private readonly ormService: OrmService) {}

  /**
   * Unified activity time-series. Counts come from the events table
   * (`events`/`tasks`) and the log_entries table (`logs`); `task_duration` is
   * an average derived from the tasks table because event `data` is
   * base64-wrapped and not SQL-queryable. All metrics share the same
   * fixed-bucket, zero-filled output shape.
   */
  async getActivityTimeseries({
    actor,
    metric,
    range,
    granularity: granularityOverride,
    groupBy = 'none',
    appId,
  }: {
    actor: User
    metric: ActivityMetric
    range: ActivityRange
    granularity?: ActivityGranularity
    groupBy?: ActivityGroupBy
    appId?: string
  }): Promise<ActivityTimeseries> {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    const granularity = granularityOverride ?? RANGE_CONFIG[range].granularity
    const now = new Date()
    const from = floorToBucket(
      new Date(now.getTime() - RANGE_CONFIG[range].ms),
      granularity,
    )
    const to = now
    const buckets = enumerateBuckets(
      from,
      floorToBucket(to, granularity),
      granularity,
    )

    const rows = await this.queryRows({
      metric,
      granularity,
      groupBy,
      from,
      to,
      appId,
    })

    return {
      metric,
      granularity,
      from: from.toISOString(),
      to: to.toISOString(),
      series: shapeSeries(rows, buckets, groupBy),
    }
  }

  /**
   * Prune synthetic task telemetry older than the retention window. Only
   * `task_completed`/`task_failed` rows are removed — domain events are never
   * touched. Returns the number of rows deleted.
   */
  async pruneTaskTelemetry(
    olderThanDays = TASK_TELEMETRY_RETENTION_DAYS,
  ): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * DAY_MS)
    const deleted = await this.ormService.db
      .delete(eventsTable)
      .where(
        and(
          inArray(eventsTable.eventIdentifier, TASK_OUTCOME_IDENTIFIERS),
          lt(eventsTable.createdAt, cutoff),
        ),
      )
      .returning({ id: eventsTable.id })
    return deleted.length
  }

  private async queryRows({
    metric,
    granularity,
    groupBy,
    from,
    to,
    appId,
  }: {
    metric: ActivityMetric
    granularity: ActivityGranularity
    groupBy: ActivityGroupBy
    from: Date
    to: Date
    appId?: string
  }): Promise<BucketRow[]> {
    switch (metric) {
      case 'events':
        return this.runBuckets({
          table: eventsTable,
          timeColumn: eventsTable.createdAt,
          valueExpr: COUNT_EXPR,
          dimExpr: dimFor(
            groupBy,
            eventsTable.emitterId,
            eventsTable.eventIdentifier,
          ),
          granularity,
          from,
          to,
          wheres: [appId ? eq(eventsTable.emitterId, appId) : undefined],
        })
      case 'tasks':
        return this.runBuckets({
          table: eventsTable,
          timeColumn: eventsTable.createdAt,
          valueExpr: COUNT_EXPR,
          dimExpr: dimFor(
            groupBy,
            eventsTable.emitterId,
            eventsTable.eventIdentifier,
          ),
          granularity,
          from,
          to,
          wheres: [
            inArray(eventsTable.eventIdentifier, TASK_OUTCOME_IDENTIFIERS),
            appId ? eq(eventsTable.emitterId, appId) : undefined,
          ],
        })
      case 'logs':
        return this.runBuckets({
          table: logEntriesTable,
          timeColumn: logEntriesTable.createdAt,
          valueExpr: COUNT_EXPR,
          dimExpr: dimFor(
            groupBy,
            logEntriesTable.emitterId,
            logEntriesTable.level,
          ),
          granularity,
          from,
          to,
          wheres: [appId ? eq(logEntriesTable.emitterId, appId) : undefined],
        })
      case 'task_duration':
        return this.runBuckets({
          table: tasksTable,
          timeColumn: tasksTable.completedAt,
          // Average wall-clock duration of terminal tasks, in milliseconds.
          valueExpr: sql<number>`coalesce(round(avg(extract(epoch from (${tasksTable.completedAt} - ${tasksTable.startedAt})) * 1000))::int, 0)`,
          // `type` has no meaning for duration — only app partitioning applies.
          dimExpr:
            groupBy === 'app' ? sql<string>`${tasksTable.ownerId}` : DIM_ALL,
          granularity,
          from,
          to,
          wheres: [
            isNotNull(tasksTable.completedAt),
            isNotNull(tasksTable.startedAt),
            appId ? eq(tasksTable.ownerId, appId) : undefined,
          ],
        })
    }
  }

  private async runBuckets({
    table,
    timeColumn,
    valueExpr,
    dimExpr,
    granularity,
    from,
    to,
    wheres,
  }: {
    table: PgTable
    timeColumn: AnyPgColumn
    valueExpr: SQL<number>
    dimExpr: SQL<string>
    granularity: ActivityGranularity
    from: Date
    to: Date
    wheres: (SQL | undefined)[]
  }): Promise<BucketRow[]> {
    const bucket = bucketExpr(timeColumn, granularity)
    // Group/order by ordinal position (1 = bucket, 2 = dim). Re-rendering the
    // same parameterized `sql` object in GROUP BY renumbers its bind params, so
    // Postgres wouldn't match it to the SELECT expression ("created_at must
    // appear in the GROUP BY clause"); and Drizzle doesn't emit SQL aliases for
    // raw `sql` select columns, so grouping by name fails too. Ordinals avoid
    // both.
    return this.ormService.db
      .select({ bucket, dim: dimExpr, value: valueExpr })
      .from(table)
      .where(and(gte(timeColumn, from), lt(timeColumn, to), ...wheres))
      .groupBy(sql`1`, sql`2`)
      .orderBy(sql`1`)
  }
}
