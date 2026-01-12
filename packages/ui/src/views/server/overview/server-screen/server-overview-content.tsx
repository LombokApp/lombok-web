import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import { CardContent, CardHeader } from '@lombokapp/ui-toolkit/components/card'
import { Card } from '@lombokapp/ui-toolkit/components/card/card'
import { DataTable } from '@lombokapp/ui-toolkit/components/data-table/data-table'
import { TypographyH3 } from '@lombokapp/ui-toolkit/components/typography-h3/typography-h3'
import { TypographySubtitle } from '@lombokapp/ui-toolkit/components/typography-subtitle/typography-subtitle'
import {
  AppWindow,
  ChartLine,
  Database,
  Folders,
  HardDrive,
  ListCheck,
  OctagonAlert,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router'

import { StatCardGroup } from '@/src/components/stat-card-group/stat-card-group'
import { $api } from '@/src/services/api'
import { serverLogsTableColumns } from '@/src/views/server/logs/server-logs-screen/server-logs-table-columns'

// Utility function to format bytes to human readable format
const formatBytes = (bytes: bigint | number | string): string => {
  let bytesNum: number
  if (typeof bytes === 'bigint') {
    bytesNum = Number(bytes)
  } else if (typeof bytes === 'string') {
    bytesNum = Number(bytes)
  } else {
    bytesNum = bytes
  }
  if (bytesNum === 0 || isNaN(bytesNum)) {
    return '0 B'
  }
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytesNum) / Math.log(k))
  return `${parseFloat((bytesNum / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function ServerOverviewContent() {
  const navigate = useNavigate()
  const { data: metrics, isLoading } = $api.useQuery(
    'get',
    '/api/v1/server/metrics',
  )

  const { data: recentLogs } = $api.useQuery('get', '/api/v1/server/logs', {
    params: {
      query: {
        limit: 20,
        sort: ['createdAt-desc'],
      },
    },
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 })
            .fill(null)
            .map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-lg bg-gray-200"
              />
            ))}
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Failed to load server metrics</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <TypographyH3>Server Metrics</TypographyH3>
      <StatCardGroup
        stats={[
          {
            title: 'Total Users',
            label: metrics.totalUsers.toString(),
            subtitle: `+${metrics.usersCreatedPreviousWeek} in the last week`,
            icon: Users,
          },
          {
            title: 'Total Folders',
            label: metrics.totalFolders.toString(),
            subtitle: `+${metrics.foldersCreatedPreviousWeek} in the last week`,
            icon: Folders,
          },
          {
            title: 'Sessions Created in the Previous Week',
            label: metrics.sessionsCreatedPreviousWeek.toString(),
            subtitle: `+${metrics.sessionsCreatedPrevious24Hours} in the last 24 hours`,
            icon: HardDrive,
          },
        ]}
      />
      <StatCardGroup
        stats={[
          {
            title: 'Total Indexed Storage',
            label: formatBytes(metrics.totalIndexedSizeBytes),
            subtitle: `${formatBytes(metrics.totalIndexedSizeBytesAcrossStorageProvisions)} in provisioned storage`,
            icon: HardDrive,
          },
          {
            title: 'Storage Provisions',
            label: metrics.provisionedStorage.totalCount.toString(),
            subtitle: metrics.provisionedStorage.summary,
            icon: Database,
          },
          {
            title: 'Installed Apps',
            label: metrics.installedApps.totalCount.toString(),
            subtitle: metrics.installedApps.summary,
            icon: AppWindow,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="p-0 pb-4 pt-3">
            <TypographyH3>Tasks</TypographyH3>
          </CardHeader>
          <CardContent className="p-0">
            <StatCardGroup
              stats={[
                {
                  title: 'Tasks Created (24 hours)',
                  label: metrics.tasksCreatedPreviousDay.toString(),
                  subtitle: `+${metrics.tasksCreatedPreviousHour} in the last hour`,
                  icon: ListCheck,
                },
                {
                  title: 'Task Errors (24 hours)',
                  label: metrics.taskErrorsPreviousDay.toString(),
                  subtitle: `+${metrics.taskErrorsPreviousHour} in the last hour`,
                  icon: OctagonAlert,
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="p-0 pb-4 pt-3">
            <TypographyH3>Events</TypographyH3>
          </CardHeader>
          <CardContent className="p-0">
            <StatCardGroup
              stats={[
                {
                  title: 'Server Events (24 hours)',
                  label: metrics.serverEventsEmittedPreviousDay.toString(),
                  subtitle: `+${metrics.serverEventsEmittedPreviousHour} in the last hour`,
                  icon: ChartLine,
                },
                {
                  title: 'Folder Events (24 hours)',
                  label: metrics.folderEventsEmittedPreviousDay.toString(),
                  subtitle: `+${metrics.folderEventsEmittedPreviousHour} in the last hour`,
                  icon: OctagonAlert,
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="p-0 pb-4 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <TypographyH3>Recent Logs</TypographyH3>
              <TypographySubtitle>Level ≥ INFO</TypographySubtitle>
            </div>
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                void navigate('/server/logs')
              }}
            >
              View all logs
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={serverLogsTableColumns}
            data={(recentLogs?.result ?? []).slice(0, 20)}
            pagination={{ pageIndex: 0, pageSize: 20 }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
