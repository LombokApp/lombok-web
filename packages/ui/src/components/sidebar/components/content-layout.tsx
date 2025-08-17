import { cn } from '@stellariscloud/ui-toolkit'

import { Navbar } from './navbar'
interface ContentLayoutProps {
  children: React.ReactNode
  breadcrumbs?: { href?: string | undefined; label: string }[]
  contentPadding?: boolean
}

export function ContentLayout({
  children,
  breadcrumbs,
  contentPadding = true,
}: ContentLayoutProps) {
  return (
    <div className="flex size-full flex-col">
      <Navbar breadcrumbs={breadcrumbs} />
      <div
        className={cn(
          'flex flex-1 flex-col items-center overflow-hidden',
          contentPadding && 'px-6',
        )}
      >
        {children}
      </div>
    </div>
  )
}
