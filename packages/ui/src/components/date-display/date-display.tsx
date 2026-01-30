import { cn } from '@lombokapp/ui-toolkit/utils'
import { dateToHumanReadable, timeSinceOrUntil } from '@lombokapp/utils'

interface DateDisplayProps {
  date: Date | string
  showTimeSince?: boolean
  showDate?: boolean | number
  className?: string
  orientation?: 'vertical' | 'horizontal'
  dateOptions?: Intl.DateTimeFormatOptions
}

export const DateDisplay = ({
  date,
  showTimeSince = true,
  showDate = true,
  className = '',
  dateOptions,
  orientation = 'vertical',
}: DateDisplayProps) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const secondSince = Date.now() - dateObj.getTime()

  return (
    <div className={className}>
      <div
        className={cn(
          'flex',
          orientation === 'vertical' ? 'flex-col' : 'flex-row gap-2',
        )}
      >
        {showDate === true ||
        (typeof showDate === 'number' && secondSince < showDate) ? (
          <span>{dateToHumanReadable(dateObj, dateOptions)}</span>
        ) : (
          <></>
        )}
        {showTimeSince && (
          <span className="text-[90%] italic opacity-60">
            {timeSinceOrUntil(dateObj)}
          </span>
        )}
      </div>
    </div>
  )
}
