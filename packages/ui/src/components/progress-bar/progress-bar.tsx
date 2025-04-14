import { cn } from '@stellariscloud/ui-toolkit'
import React from 'react'

export const ProgressBar = ({
  progress,
  className,
}: {
  progress: number
  className?: string
}) => {
  return (
    <div
      className={cn(
        'h-6 w-full overflow-hidden rounded-full bg-black/20',
        className,
      )}
    >
      <div
        className={cn('h-full rounded-full bg-blue-500')}
        style={{ width: `${Math.floor(progress)}%` }}
      />
    </div>
  )
}
