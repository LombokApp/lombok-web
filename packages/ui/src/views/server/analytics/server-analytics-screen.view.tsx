import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lombokapp/ui-toolkit/components/select'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@lombokapp/ui-toolkit/components/toggle-group'
import { TypographyH3 } from '@lombokapp/ui-toolkit/components/typography-h3'
import * as React from 'react'

import {
  ActivityChart,
  type ActivityGroupBy,
  type ActivityRange,
} from '../analytics/activity-chart'

const RANGES: { value: ActivityRange; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
]

const GROUP_BY_OPTIONS: { value: ActivityGroupBy; label: string }[] = [
  { value: 'none', label: 'No breakdown' },
  { value: 'app', label: 'By app' },
  { value: 'type', label: 'By type' },
]

export function ServerAnalyticsScreen() {
  const [range, setRange] = React.useState<ActivityRange>('7d')
  const [groupBy, setGroupBy] = React.useState<ActivityGroupBy>('none')

  // Counts read better with a breakdown — fall back to type when the global
  // control is set to "no breakdown".
  const breakdownGroupBy: ActivityGroupBy =
    groupBy === 'none' ? 'type' : groupBy

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TypographyH3>Activity</TypographyH3>
        <div className="flex items-center gap-3">
          <Select
            value={groupBy}
            onValueChange={(value) => setGroupBy(value as ActivityGroupBy)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUP_BY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(value) => {
              if (value) {
                setRange(value as ActivityRange)
              }
            }}
            variant="outline"
            size="sm"
          >
            {RANGES.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActivityChart
          title="Events"
          subtitle="Platform and app events emitted over time"
          metric="events"
          range={range}
          groupBy={groupBy}
          kind="line"
        />
        <ActivityChart
          title="Tasks"
          subtitle="Completed vs failed task outcomes"
          metric="tasks"
          range={range}
          groupBy={breakdownGroupBy}
          kind="bar"
        />
        <ActivityChart
          title="Average task duration"
          subtitle="Mean wall-clock duration (ms) of completed tasks"
          metric="task_duration"
          range={range}
          groupBy={groupBy}
          kind="line"
        />
        <ActivityChart
          title="Logs"
          subtitle="Log entries by level"
          metric="logs"
          range={range}
          groupBy={breakdownGroupBy}
          kind="bar"
        />
      </div>
    </div>
  )
}
