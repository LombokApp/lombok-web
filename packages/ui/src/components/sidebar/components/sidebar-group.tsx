import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'

interface SidebarGroupProps {
  label?: string
  children: React.ReactNode
}

export function SidebarGroup({ label, children }: SidebarGroupProps) {
  return (
    <li className={cn('w-full justify-center', label ? 'pt-6' : '')}>
      {label && (
        <p className="mb-2 px-3 text-xs font-medium text-muted-foreground/50">
          {label}
        </p>
      )}
      {!label && <div className="mb-2" />}
      <div className="space-y-1 px-3">{children}</div>
    </li>
  )
}
