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
      <ul role="list" className="divide-y divide-gray-100">
        {items.map((item, i) => (
          <li key={i} className="flex justify-between gap-x-6 py-5">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
