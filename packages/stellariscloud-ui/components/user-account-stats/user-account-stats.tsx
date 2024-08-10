import clsx from 'clsx'

export interface UserAccountStatsData {
  [key: string]: { value: string; label: string; unit?: string }
}

const BG_COLOUR = 'bg-gray-200 dark:bg-rose-500'

export function UserAccountStats({ stats }: { stats: UserAccountStatsData }) {
  return (
    <div className={clsx('rounded-xl overflow-hidden', BG_COLOUR)}>
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-px bg-white/5 sm:grid-cols-2">
          {Object.keys(stats).map((statKey) => (
            <div
              key={statKey}
              className={clsx('px-4 py-6 sm:px-6 lg:px-8', BG_COLOUR)}
            >
              <p className="text-sm font-medium leading-6 text-black dark:text-white">
                {stats[statKey].label}
              </p>
              <p className="mt-2 flex items-baseline gap-x-2">
                <span className="text-4xl font-semibold tracking-tight text-black dark:text-white">
                  {stats[statKey].value}
                </span>
                {stats[statKey].unit ? (
                  <span className="text-sm text-black dark:text-white">
                    {stats[statKey].unit}
                  </span>
                ) : null}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
