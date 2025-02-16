import { Navbar } from './navbar'
interface ContentLayoutProps {
  children: React.ReactNode
  breadcrumbs?: { href?: string | undefined; label: string }[]
  onSignout: () => Promise<void>
}

export function ContentLayout({
  children,
  breadcrumbs,
  onSignout,
}: ContentLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <Navbar onSignout={onSignout} breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-6">
        {children}
      </div>
    </div>
  )
}
