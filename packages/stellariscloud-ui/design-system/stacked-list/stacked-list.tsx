import clsx from 'clsx'
import React from 'react'

export function StackedList({
  items,
  className,
}: {
  items: React.ReactNode[]
  className?: string
}) {
  return (
    <div className={clsx('w-full', className)}>
      <div className={clsx('overflow-hidden shadow-sm', 'flex flex-col gap-2')}>
        {items.map((item, i) => (
          <div
            key={i}
            className="relative flex items-center bg-foreground/5 rounded-lg"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}
