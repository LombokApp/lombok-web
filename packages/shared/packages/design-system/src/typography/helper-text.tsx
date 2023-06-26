import clsx from 'clsx'
import type { ComponentType, HTMLAttributes } from 'react'

export interface HelperTextProps extends HTMLAttributes<HTMLHeadingElement> {
  /**
   * Whether or not the helper text is meant to indicate an error.
   */
  isError?: boolean
  as?: string | ComponentType<{ className: string }>
  customSize?: boolean
}

export function HelperText({
  isError = false,
  as,
  className,
  customSize = false,
  ...rest
}: HelperTextProps) {
  const Component = as ?? 'p'
  return (
    <Component
      className={clsx(
        customSize ? null : 'text-sm',
        isError && 'text-red-500',
        className,
      )}
      {...rest}
    />
  )
}
