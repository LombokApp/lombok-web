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
      <ul
        role="list"
        className={clsx(
          'divide-y divide-gray-100 dark:divide-indigo-600 overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 dark:ring-blue-900/5 sm:rounded-xl',
          'dark:bg-indigo-800',
          'text-gray-800 dark:text-white',
        )}
      >
        {items.map((item, i) => (
          <li
            key={i}
            className="relative flex items-center hover:bg-gray-50 dark:hover:bg-indigo-700"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
