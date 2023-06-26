import clsx from 'clsx'
import React from 'react'

export type IconSizeType = 'sm' | 'md' | 'lg' | 'xl' | 'text'

export interface IconProps {
  icon: React.ForwardRefExoticComponent<
    React.SVGProps<SVGSVGElement> & {
      title?: string | undefined
      titleId?: string | undefined
    }
  >
  size?: IconSizeType
  className?: string
}

export function Icon({ icon, size = 'text', className }: IconProps) {
  const IconComponent = icon
  return (
    <IconComponent
      aria-hidden="true"
      className={clsx(
        size === 'sm'
          ? 'w-4 h-4'
          : size === 'md'
          ? 'w-6 h-6'
          : size === 'lg'
          ? 'w-12 h-12'
          : size === 'xl'
          ? 'w-16 h-16'
          : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          size === 'text'
          ? 'w-em h-em'
          : null,
        className,
      )}
    />
  )
}
