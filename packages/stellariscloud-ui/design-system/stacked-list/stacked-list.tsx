import { cn } from '@stellariscloud/ui-toolkit'
import React from 'react'

export function StackedList({
  items,
  className,
}: {
  items: React.ReactNode[]
  className?: string
}) {
  return (
    <div className={cn('w-full', className)}>
      <div className={cn('overflow-hidden', 'flex flex-col gap-4')}>
        {items.map((item, i) => (
          <div
            className="rounded-md border border-foreground/5 bg-foreground/[.03] text-sm font-bold"
            key={i}
          >
            <div className="p-4">{item}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
