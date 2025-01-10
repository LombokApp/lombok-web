import { cn } from '@stellariscloud/ui-toolkit'
import React from 'react'

export const ProgressBar = ({ progress }: { progress: number }) => {
  return (
    <div className="h-6 w-full overflow-hidden rounded-full bg-black/20">
      <div
        className={cn('h-full rounded-full bg-blue-500')}
        style={{ width: `${Math.floor(progress)}%` }}
      />
    </div>
  )
}
