import clsx from 'clsx'
import type { ComponentType, HTMLAttributes } from 'react'

export interface ParagraphProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: string | ComponentType<{ className: string }>
  customSize?: boolean
}

export function Paragraph({
  as,
  className,
  customSize,
  ...rest
}: ParagraphProps) {
  const Component = as ?? 'p'
  return (
    <Component
      className={clsx(
        'max-w-prose',
        customSize ? null : 'text-base',
        className,
      )}
      {...rest}
    />
  )
}
