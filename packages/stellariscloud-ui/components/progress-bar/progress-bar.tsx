import { cn } from '@stellariscloud/ui-toolkit'
import React from 'react'

export const ProgressBar = ({ progress }: { progress: number }) => {
  return (
    <div className="w-full h-6 rounded-full overflow-hidden bg-black/20">
      <div
        className={cn('h-full bg-blue-500 rounded-full')}
        style={{ width: `${Math.floor(progress)}%` }}
      />
    </div>
  )
}
