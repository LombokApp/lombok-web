import clsx from 'clsx'
import React from 'react'

export type IconSizeType = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'text'

export interface IconProps {
  icon: React.ForwardRefExoticComponent<
    React.PropsWithoutRef<
      React.SVGProps<SVGSVGElement> & {
        title?: string | undefined
        titleId?: string | undefined
      }
    >
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
        'text-foreground',
        size === 'xs'
          ? 'w-3 h-3'
          : size === 'sm'
            ? 'w-5 h-5'
            : size === 'md'
              ? 'w-7 h-7'
              : size === 'lg'
                ? 'w-12 h-12'
                : size === 'xl'
                  ? 'w-16 h-16'
                  : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    size === 'text'
                    ? 'w-em h-em'
                    : null,
        // 'text-black dark:text-white',
        className,
      )}
    />
  )
}
