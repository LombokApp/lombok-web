import clsx from 'clsx'
import React from 'react'

import type { IconProps } from '../icon'
import { Icon } from '../icon'

export const Badge = ({
  className,
  children,
  style = 'normal',
  icon,
  size = 'sm',
}: {
  children: React.ReactNode
  className?: string
  icon?: IconProps['icon']
  style?: 'normal' | 'warn' | 'error' | 'success' | 'info'
  size?: 'xs' | 'sm' | 'md' | 'lg'
}) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-lg',
        size === 'xs'
          ? 'px-2 py-[.025rem] text-xs'
          : size === 'sm'
            ? 'px-3 py-[.05rem] text-md'
            : size === 'md'
              ? 'px-3 py-[.15rem] text-lg'
              : 'px-4 py-[.2rem] text-2xl',

        style === 'normal' && 'bg-gray-50/10  text-gray-400 ring-gray-400/20',
        style === 'warn' &&
          'dark:bg-yellow-50/10 text-yellow-600 dark:text-yellow-400 ring-yellow-400 dark:ring-yellow-400/20 bg-yellow-100',
        style === 'error' &&
          'bg-red-50/10 text-xs text-red-400 ring-red-400/20',
        style === 'success' &&
          'bg-green-50/10 text-green-400 ring-green-400/50',
        style === 'info' &&
          'bg-blue-50 text-blue-500 ring-blue-400/80 dark:bg-blue-50/10 dark:text-blue-400 dark:ring-blue-400/50',
        'font-medium ring-1',
        'ring-inset',
        className,
      )}
    >
      <div className="flex gap-2 items-center">
        {icon && (
          <Icon
            icon={icon}
            className="dark:text-yellow-400 text-yellow-800"
            size="xs"
          />
        )}
        <span className="text-[80%]">{children}</span>
      </div>
    </span>
  )
}
