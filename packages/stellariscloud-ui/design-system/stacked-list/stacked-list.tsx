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
          'divide-y divide-gray-100 dark:divide-blue-800 overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 dark:ring-blue-900/5 sm:rounded-xl',
          'dark:bg-indigo-800',
          'text-gray-800 dark:text-white',
        )}
      >
        {items.map((item, i) => (
          <li
            key={i}
            className="relative flex items-center justify-between gap-x-6 px-4 py-5 hover:bg-gray-50 dark:hover:bg-indigo-700 sm:px-6"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
