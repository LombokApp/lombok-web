import clsx from 'clsx'

export interface LabelProps {
  srOnly?: string
  className?: string
  isError?: boolean
  children: React.ReactNode
}

export function Label({ className, isError, srOnly, children }: LabelProps) {
  return (
    <span
      className={clsx(
        srOnly ? 'sr-only' : null,
        isError && 'text-red-500',
        'font-light tracking-wide',
        className,
      )}
    >
      {children}
    </span>
  )
}
