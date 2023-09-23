import clsx from 'clsx'
import React from 'react'

import { Button } from '../button/button'
import type { IconProps } from '../icon'
import { Icon } from '../icon'

const _DARK_ACTIVE_CLASSES =
  'dark:active:bg-white/60 dark:active:bg-gray-50 dark:active:text-white'

export function ButtonGroup({
  buttons,
  className,
  size = 'lg',
}: {
  buttons: {
    name: string
    primary?: boolean
    selected?: boolean
    danger?: boolean
    disabled?: boolean
    icon?: IconProps['icon']
    preventDefaultOnClick?: boolean
    onClick?: React.ButtonHTMLAttributes<HTMLButtonElement>['onClick']
  }[]
  className?: string

  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}) {
  return (
    <div className={clsx('flex items-center', className)}>
      {buttons.map(
        (
          {
            name,
            danger,
            icon,
            primary,
            disabled,
            onClick,
            preventDefaultOnClick,
          },
          i,
        ) => {
          return (
            <Button
              size={size}
              disabled={disabled}
              primary={primary}
              danger={danger}
              onClick={onClick}
              preventDefaultOnClick={preventDefaultOnClick}
              key={i}
              className={clsx(
                'rounded-none first:rounded-l-md last:rounded-r-md',
              )}
            >
              {icon && (
                <Icon
                  icon={icon}
                  size={'sm'}
                  className={clsx(primary || danger ? 'text-white' : '')}
                />
              )}
              {name}
            </Button>
          )
        },
      )}
    </div>
  )
}
