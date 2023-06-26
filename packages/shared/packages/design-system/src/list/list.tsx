import clsx from 'clsx'
import type { ReactNode } from 'react'

interface ListProps {
  className?: string
  children: ReactNode[]
}

export function List({ className, children }: ListProps) {
  return (
    <span className={clsx('flex flex-col leading-none', className)}>
      {children}
    </span>
  )
}
