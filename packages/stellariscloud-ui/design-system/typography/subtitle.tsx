import clsx from 'clsx'
import type { ComponentType, HTMLAttributes } from 'react'

export interface SubtitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: string | ComponentType<{ className: string }>
  customSize?: boolean
}

export function Subtitle({
  as,
  className,
  customSize = false,
  ...rest
}: SubtitleProps) {
  const Component = as ?? 'p'
  return (
    <Component
      className={clsx('font-light', customSize ? null : 'text-lg', className)}
      {...rest}
    />
  )
}
