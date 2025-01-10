import { cn } from '@stellariscloud/ui-toolkit'
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
      className={cn(
        'text-foreground',
        size === 'xs'
          ? 'size-3'
          : size === 'sm'
            ? 'size-5'
            : size === 'md'
              ? 'size-7'
              : size === 'lg'
                ? 'size-12'
                : size === 'xl'
                  ? 'size-16'
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
