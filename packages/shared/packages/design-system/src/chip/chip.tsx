import type { ReactNode } from 'react'

interface ChipProps {
  children: ReactNode
  styleType?: 'info' | 'warn' | 'error' | 'pink'
  className?: string
}

export function Chip({ children, styleType, className }: ChipProps) {
  return (
    <div
      className={`inline-flex items-center rounded-full justify-center px-2 py-1 ${
        styleType === 'pink'
          ? 'bg-pink-500 text-white'
          : styleType === 'info'
          ? 'bg-blue-300'
          : styleType === 'warn'
          ? 'bg-amber-300'
          : 'bg-transparent'
      } ${className}`}
    >
      {children}
    </div>
  )
}
