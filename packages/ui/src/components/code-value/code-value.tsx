import { cn } from '@lombokapp/ui-toolkit/utils'

/**
 * Inline code-styled wrapper for machine values (IPs, PIDs, paths, commands, etc.)
 */
export function CodeValue({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground',
        className,
      )}
    >
      {children}
    </span>
  )
}
