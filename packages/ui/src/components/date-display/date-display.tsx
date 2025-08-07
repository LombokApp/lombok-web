import { dateToHumanReadable, timeSinceOrUntil } from '@stellariscloud/utils'

interface DateDisplayProps {
  date: Date | string
  showTimeSince?: boolean
  className?: string
  dateOptions?: Intl.DateTimeFormatOptions
}

export const DateDisplay = ({
  date,
  showTimeSince = true,
  className = '',
  dateOptions,
}: DateDisplayProps) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  return (
    <div className={className}>
      <div className="flex flex-col">
        <span>{dateToHumanReadable(dateObj, dateOptions)}</span>
        {showTimeSince && (
          <span className="text-[90%] italic">{timeSinceOrUntil(dateObj)}</span>
        )}
      </div>
    </div>
  )
}
