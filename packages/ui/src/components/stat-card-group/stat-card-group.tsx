import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
} from '@stellariscloud/ui-toolkit'

export interface Stat {
  title: string
  label: string
  subtitle: string
  icon?: React.ComponentType<{ className?: string }>
}

export function StatCardGroup({ stats }: { stats: Stat[] }) {
  return (
    <div
      className={cn(
        'grid gap-4',
        stats.length % 2 === 0
          ? '@container grid-cols-2 @[400px]:grid-cols-4'
          : '@container grid-cols-3 @[400px]:grid-cols-4',
      )}
    >
      {stats.map((stat, i) => {
        return (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              {stat.icon && <stat.icon />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.label}</div>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
