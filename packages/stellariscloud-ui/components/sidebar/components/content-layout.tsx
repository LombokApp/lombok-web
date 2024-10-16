import { Navbar } from './navbar'
import { Type } from 'lucide-react'
interface ContentLayoutProps {
  description?: string
  children: React.ReactNode
  titleIcon: typeof Type
  breadcrumbs?: { href?: string; label: string }[]
}

export function ContentLayout({
  titleIcon,
  description,
  children,
  breadcrumbs,
}: ContentLayoutProps) {
  return (
    <div className="h-full flex flex-col">
      <Navbar
        titleIcon={titleIcon}
        description={description}
        breadcrumbs={breadcrumbs}
      />
      <div className="overflow-x-hidden flex-1">{children}</div>
    </div>
  )
}
