import { Navbar } from './navbar'
interface ContentLayoutProps {
  children: React.ReactNode
  breadcrumbs?: { href?: string | undefined; label: string }[]
}

export function ContentLayout({ children, breadcrumbs }: ContentLayoutProps) {
  return (
    <div className="h-full flex flex-col">
      <Navbar breadcrumbs={breadcrumbs} />
      <div className="overflow-x-hidden overflow-y-auto flex flex-col flex-1 p-6">
        {children}
      </div>
    </div>
  )
}
