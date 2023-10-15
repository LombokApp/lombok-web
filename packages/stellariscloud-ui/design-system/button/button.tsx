import clsx from 'clsx'
import React from 'react'

import type { IconProps } from '../icon'
import { Icon } from '../icon'

export function Button({
  children,
  className,
  primary = false,
  danger = false,
  link = false,
  onClick,
  size = 'lg',
  preventDefaultOnClick,
  disabled = false,
  selected = false,
  icon,
}: {
  className?: string
  children?: React.ReactNode
  primary?: boolean
  danger?: boolean
  link?: boolean
  onClick?: React.ButtonHTMLAttributes<HTMLButtonElement>['onClick']
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  preventDefaultOnClick?: boolean
  disabled?: boolean
  selected?: boolean
  icon?: IconProps['icon']
}) {
  const clickHandler = (e: React.MouseEvent) => {
    if (preventDefaultOnClick) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (onClick) {
      onClick(e as React.MouseEvent<HTMLButtonElement>)
    }
  }
  const regular = !primary && !danger && !link
  return (
    <div className={clsx('relative')}>
      <div
        className={clsx(
          selected && 'absolute h-full w-full bg-black opacity-20',
        )}
      />
      <button
        disabled={disabled}
        onClick={clickHandler}
        type="button"
        className={clsx(
          'flex items-center gap-2 justify-center rounded-md',
          'text-sm font-semibold leading-6',
          size === 'xl'
            ? 'px-3.5 py-2.5'
            : size === 'lg'
            ? 'px-3 py-2'
            : size === 'md'
            ? 'px-2.5 py-1.5'
            : size === 'sm'
            ? 'px-2 py-1'
            : 'px-2 py-0',
          'focus-visible:outline focus-visible:outline-2',
          'focus-visible:outline-offset-2',
          'border',
          'duration-200',
          primary &&
            clsx(
              'text-white dark:text-white/80',
              'dark:text-white bg-gradient-to-l from-blue-800 to-indigo-600 dark:bg-gradient-to-r text-white focus-visible:outline-indigo-600 border-indigo-900',
            ),
          danger &&
            clsx(
              'text-white dark:text-white/80',
              'text-gray-900 ring-inset ring-gray-300 hover:bg-gray-50 border-gray-200 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/20 dark:border-transparent',
              'border-red-500 bg-red-500 hover:bg-red-500 text-white focus-visible:outline-red-600',
            ),
          link &&
            clsx(
              'border-0 bg-transparent dark:bg-transparent',
              'hover:text-gray-600 dark:text-white hover:dark:text-gray-300',
              'text-gray-900 dark:text-gray-300',
            ),
          regular &&
            'text-gray-800 dark:text-gray-200 shadow-sm dark:border-transparent hover:bg-gray-50 dark:hover:bg-white/20 bg-white/10',
          className,
        )}
      >
        {icon && (
          <Icon
            size="sm"
            icon={icon}
            className={clsx(
              (primary || danger) && 'text-white dark:text-white',
            )}
          />
        )}
        {children}
      </button>
    </div>
  )
}
