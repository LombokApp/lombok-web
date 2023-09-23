import clsx from 'clsx'
import React from 'react'
import { Icon, IconProps } from '../icon'

export function Button({
  children,
  className,
  primary = false,
  danger = false,
  onClick,
  size = 'lg',
  preventDefaultOnClick,
  disabled = false,
  icon,
}: {
  className?: string
  children?: React.ReactNode
  primary?: boolean
  danger?: boolean
  onClick?: React.ButtonHTMLAttributes<HTMLButtonElement>['onClick']
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  preventDefaultOnClick?: boolean
  disabled?: boolean
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
  return (
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
        'shadow-sm',
        'focus-visible:outline focus-visible:outline-2',
        'focus-visible:outline-offset-2',
        primary
          ? 'bg-indigo-600 dark:text-white hover:bg-indigo-500 text-white focus-visible:outline-indigo-600 border border-indigo-600'
          : 'text-gray-900 ring-inset ring-gray-300 hover:bg-gray-50 border border-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:border-transparent',
        danger
          ? 'border-red-500 bg-red-500 hover:bg-red-500 text-white focus-visible:outline-red-600'
          : '',
        primary || danger ? 'text-white dark:text-white' : 'bg-white',
        className,
      )}
    >
      {icon && (
        <Icon
          size="sm"
          icon={icon}
          className={clsx((primary || danger) && 'text-white dark:text-white')}
        />
      )}
      {children}
    </button>
  )
}
