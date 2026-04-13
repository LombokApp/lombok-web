import {
  CardContent,
  CardHeader,
  CardTitle,
} from '@lombokapp/ui-toolkit/components/card'
import { Card } from '@lombokapp/ui-toolkit/components/card/card'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'

export interface Stat {
  title: string
  label: string
  subtitle: string
  icon?: React.ComponentType<{ className?: string }>
}

const WIDE_ROW_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}

function rowSizes(n: number): number[] {
  if (n <= 0) return []
  if (n <= 4) return [n]
  for (let fours = Math.floor(n / 4); fours >= 0; fours--) {
    const rem = n - fours * 4
    if (rem % 3 === 0) {
      return [...Array<number>(fours).fill(4), ...Array<number>(rem / 3).fill(3)]
    }
  }
  return [3, n - 3]
}

function chunkStats(stats: Stat[]): Stat[][] {
  const rows: Stat[][] = []
  let offset = 0
  for (const size of rowSizes(stats.length)) {
    rows.push(stats.slice(offset, offset + size))
    offset += size
  }
  return rows
}

function StatCard({ stat }: { stat: Stat }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
        {stat.icon && <stat.icon />}
      </CardHeader>
      <CardContent className="flex-1">
        <div className="text-2xl font-bold">{stat.label}</div>
        <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
      </CardContent>
    </Card>
  )
}

export function StatCardGroup({
  stats,
  className,
}: {
  stats: Stat[]
  className?: string
}) {
  const rows = chunkStats(stats)
  const narrowOddLast = stats.length >= 3 && stats.length % 2 === 1

  return (
    <div className={cn('@container', className)}>
      <div className="grid grid-cols-1 gap-4 @min-[500px]:grid-cols-2 @min-[800px]:hidden">
        {stats.map((stat, i) => (
          <div
            key={i}
            className={cn(
              narrowOddLast &&
                i === stats.length - 1 &&
                '@min-[500px]:col-span-2',
            )}
          >
            <StatCard stat={stat} />
          </div>
        ))}
      </div>
      <div className="hidden gap-4 @min-[800px]:grid">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={cn('grid gap-4', WIDE_ROW_COLS[row.length])}
          >
            {row.map((stat, i) => (
              <StatCard key={i} stat={stat} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
