import { Navbar } from './navbar'
interface ContentLayoutProps {
  children: React.ReactNode
  breadcrumbs?: { href?: string | undefined; label: string }[]
}

export function ContentLayout({ children, breadcrumbs }: ContentLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <Navbar breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-6">
        {children}
      </div>
    </div>
  )
}
