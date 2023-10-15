import clsx from 'clsx'
import React from 'react'

import type { IconProps } from '../icon'
import { Icon } from '../icon'

export const Badge = ({
  className,
  children,
  style = 'normal',
  icon,
}: {
  children: React.ReactNode
  className?: string
  icon?: IconProps['icon']
  style?: 'normal' | 'warn' | 'error' | 'success'
}) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full',
        'px-2 py-0 text-xs',
        style === 'normal' && 'bg-gray-50/10  text-gray-400 ring-gray-400/20',
        style === 'warn' &&
          'bg-yellow-50/10 text-yellow-400 ring-yellow-400/20',
        style === 'error' &&
          'bg-red-50/10 text-xs text-red-400 ring-red-400/20',
        style === 'success' &&
          'bg-green-50/10 text-green-400 ring-green-400/50',
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
