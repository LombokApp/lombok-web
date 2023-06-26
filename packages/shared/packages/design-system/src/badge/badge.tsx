import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  styleType?: 'info' | 'warn' | 'error' | 'pink'
}

export function Badge({ children, styleType }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-xl justify-center px-2 py-1 text-xs font-light leading-none border ${
        styleType === 'pink'
          ? 'bg-fuchsia-300'
          : styleType === 'info'
          ? 'bg-blue-300'
          : styleType === 'warn'
          ? 'bg-amber-300'
          : 'bg-transparent'
      }`}
    >
      {children}
    </span>
  )
}
