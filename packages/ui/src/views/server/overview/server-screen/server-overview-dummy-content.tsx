import {
  Card,
  CardContent,
  CardHeader,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  TypographyH3,
} from '@stellariscloud/ui-toolkit'
import { Database, Folders, HardDrive, Users } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts'

import { StatCardGroup } from '../../../../components/stat-card-group/stat-card-group'

export function ServerOverviewContent() {
  return (
    <div className="flex flex-col gap-4">
      <StatCardGroup
        stats={[
          {
            title: 'Total Users',
            label: '47',
            subtitle: '+ 3 in the last week',
            icon: Users,
          },
          {
            title: 'Total Folders',
            label: '389',
            subtitle: '+27 in the last week',
            icon: Folders,
          },
          {
            title: 'Total Indexed',
            label: '45.53TB',
            subtitle: '+354GB in the last week',
            icon: HardDrive,
          },
        ]}
      />
      <StatCardGroup
        stats={[
          {
            title: 'Storage Provisions',
            label: '4',
            subtitle: 'MinIO NL, Minio FR, AWS USEast1 and one more',
            icon: Database,
          },
          {
            title: 'Storage Used',
            label: '10.19TB',
            subtitle: '+42GB in the last week',
            icon: HardDrive,
          },
          {
            title: 'Total Folders',
            label: '389',
            subtitle: '+27 in the last week',
            icon: Folders,
          },
        ]}
      />

      {/* User Growth Chart */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="p-4 pb-1 pt-3">
            <TypographyH3>User Growth</TypographyH3>
          </CardHeader>
          <CardContent className="p-4">
            {/* User growth bar chart */}
            <ChartContainer
              config={{
                users: {
                  label: 'Users',
                  color: '#2563eb',
                },
                newUsers: {
                  label: 'New Users',
                  color: '#60a5fa',
                },
              }}
              className="h-[250px] w-full"
            >
              <BarChart
                accessibilityLayer
                data={[
                  { month: 'Jan', users: 35, newUsers: 12 },
                  { month: 'Feb', users: 38, newUsers: 8 },
                  { month: 'Mar', users: 40, newUsers: 5 },
                  { month: 'Apr', users: 42, newUsers: 7 },
                  { month: 'May', users: 45, newUsers: 9 },
                  { month: 'Jun', users: 47, newUsers: 3 },
                ]}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="users" fill="var(--color-users)" radius={4} />
                <Bar
                  dataKey="newUsers"
                  fill="var(--color-newUsers)"
                  radius={4}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Storage Usage Chart */}
        <Card>
          <CardHeader className="p-4 pb-1 pt-3">
            <TypographyH3>Storage Usage (TB)</TypographyH3>
          </CardHeader>
          <CardContent className="p-4">
            {/* Storage usage line chart */}
            <ChartContainer
              config={{
                minio: {
                  label: 'MinIO',
                  color: '#2563eb',
                },
                aws: {
                  label: 'AWS',
                  color: '#60a5fa',
                },
                local: {
                  label: 'Local',
                  color: '#93c5fd',
                },
              }}
              className="h-[250px] w-full"
            >
              <LineChart
                accessibilityLayer
                data={[
                  {
                    month: 'Jan',
                    minio: 2.8,
                    aws: 1.5,
                    local: 4.1,
                  },
                  {
                    month: 'Feb',
                    minio: 3.2,
                    aws: 1.8,
                    local: 4.3,
                  },
                  {
                    month: 'Mar',
                    minio: 3.5,
                    aws: 2.1,
                    local: 4.2,
                  },
                  {
                    month: 'Apr',
                    minio: 3.8,
                    aws: 2.3,
                    local: 4.4,
                  },
                  {
                    month: 'May',
                    minio: 4.1,
                    aws: 2.5,
                    local: 4.5,
                  },
                  {
                    month: 'Jun',
                    minio: 4.5,
                    aws: 2.7,
                    local: 4.6,
                  },
                ]}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="minio"
                  stroke="var(--color-minio)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="aws"
                  stroke="var(--color-aws)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="local"
                  stroke="var(--color-local)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
