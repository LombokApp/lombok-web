import {
  Bar,
  BarChart,
  CartesianGrid,
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from '@lombokapp/ui-toolkit/components/chart'
import { Skeleton } from '@lombokapp/ui-toolkit/components/skeleton'
import { format } from 'date-fns'
import * as React from 'react'

import { $api } from '@/src/services/api'

export type ActivityMetric = 'events' | 'tasks' | 'task_duration' | 'logs'
export type ActivityRange = '24h' | '7d' | '30d' | '90d'
export type ActivityGroupBy = 'none' | 'app' | 'type'

interface ActivityChartProps {
  title: string
  subtitle?: string
  metric: ActivityMetric
  range: ActivityRange
  groupBy: ActivityGroupBy
  kind: 'bar' | 'line'
}

const PALETTE = [
  '#3b82f6',
  '#22c55e',
  '#ef4444',
  '#f59e0b',
  '#a855f7',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
]

// Stable colors for well-known series so outcomes/levels read consistently.
const SEMANTIC_COLORS: Record<string, string> = {
  all: '#3b82f6',
  core: '#6366f1',
  task_completed: '#22c55e',
  task_failed: '#ef4444',
  ERROR: '#ef4444',
  WARN: '#f59e0b',
  INFO: '#3b82f6',
  DEBUG: '#94a3b8',
  TRACE: '#cbd5e1',
}

const SEMANTIC_LABELS: Record<string, string> = {
  all: 'Total',
  core: 'Core',
  task_completed: 'Completed',
  task_failed: 'Failed',
}

const colorFor = (key: string, index: number) =>
  SEMANTIC_COLORS[key] ?? PALETTE[index % PALETTE.length]
const labelFor = (key: string) => SEMANTIC_LABELS[key] ?? key

export function ActivityChart({
  title,
  subtitle,
  metric,
  range,
  groupBy,
  kind,
}: ActivityChartProps) {
  // `type` grouping is meaningless for an averaged duration metric.
  const effectiveGroupBy =
    metric === 'task_duration' && groupBy === 'type' ? 'none' : groupBy

  const { data, isLoading } = $api.useQuery(
    'get',
    '/api/v1/server/metrics/activity',
    { params: { query: { metric, range, groupBy: effectiveGroupBy } } },
  )

  const series = React.useMemo(() => data?.series ?? [], [data])
  const granularity = data?.granularity ?? 'day'

  const rows = React.useMemo(() => {
    const byBucket = new Map<string, Record<string, number | string>>()
    for (const s of series) {
      for (const point of s.points) {
        const row = byBucket.get(point.bucket) ?? { bucket: point.bucket }
        row[s.key] = point.value
        byBucket.set(point.bucket, row)
      }
    }
    return [...byBucket.values()]
  }, [series])

  const config = React.useMemo<ChartConfig>(() => {
    const next: ChartConfig = {}
    series.forEach((s, index) => {
      next[s.key] = { label: labelFor(s.key), color: colorFor(s.key, index) }
    })
    return next
  }, [series])

  const safeFormat = (value: unknown, pattern: string) => {
    const date = new Date(String(value))
    return Number.isNaN(date.getTime()) ? '' : format(date, pattern)
  }
  const formatTick = (value: string) =>
    safeFormat(value, granularity === 'hour' ? 'HH:mm' : 'MMM d')
  // This fork's ChartTooltipContent only forwards the x-value to labelFormatter
  // when it's a config key, so resolve the bucket from the hovered row instead.
  const formatLabel = (
    items: { payload?: { bucket?: string } }[] | undefined,
  ) =>
    safeFormat(
      items?.[0]?.payload?.bucket,
      granularity === 'hour' ? 'MMM d, HH:mm' : 'MMM d',
    )

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border p-4">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {subtitle ? (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        ) : null}
      </div>
      {isLoading ? (
        <Skeleton className="h-[240px] w-full" />
      ) : (
        <ChartContainer
          config={config}
          className="aspect-auto h-[240px] w-full"
        >
          {kind === 'bar' ? (
            <BarChart data={rows}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="bucket"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={formatTick}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={40}
                allowDecimals={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_value, items) => formatLabel(items)}
                  />
                }
              />
              {series.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  stackId="activity"
                  fill={`var(--color-${s.key})`}
                />
              ))}
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          ) : (
            <LineChart data={rows}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="bucket"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={formatTick}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={40}
                allowDecimals={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_value, items) => formatLabel(items)}
                  />
                }
              />
              {series.map((s) => (
                <Line
                  key={s.key}
                  dataKey={s.key}
                  stroke={`var(--color-${s.key})`}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
              <ChartLegend content={<ChartLegendContent />} />
            </LineChart>
          )}
        </ChartContainer>
      )}
    </div>
  )
}
