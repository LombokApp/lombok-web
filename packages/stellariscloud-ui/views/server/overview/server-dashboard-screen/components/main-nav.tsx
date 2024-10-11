import Link from 'next/link'

import { cn } from '@/utils'

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn('flex items-center space-x-4 lg:space-x-6', className)}
      {...props}
    >
      <Link
        href="/examples/dashboard"
        className="text-sm font-medium transition-colors hover:text-primary"
      >
        Overview
      </Link>
      <Link
        href="users"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Users
      </Link>
      <Link
        href="storage"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Storage
      </Link>
      <Link
        href="apps"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Apps
      </Link>
      <Link
        href="events"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Events
      </Link>
      <Link
        href="settings"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Settings
      </Link>
    </nav>
  )
}
