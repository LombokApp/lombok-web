import { useAuthContext } from '@stellariscloud/auth-utils'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@stellariscloud/ui-toolkit'
import React from 'react'
import { Link } from 'react-router-dom'

import { ModeToggle } from '../../mode-toggle/mode-toggle'
import { SheetMenu } from './sheet-menu'
import { UserNav } from './user-nav'

interface NavbarProps {
  breadcrumbs?: { href?: string; label: string }[]
}

export function Navbar({ breadcrumbs }: NavbarProps) {
  const authContext = useAuthContext()
  return (
    <header className="bg-background/[.95] supports-[backdrop-filter]:bg-background/60 dark:shadow-foreground/10 sticky top-0 z-10 w-full border-b py-2">
      <div className="mx-4 flex h-8 items-center sm:mx-8">
        <div className="flex items-center space-x-4 lg:space-x-0">
          {authContext.viewer && (
            <SheetMenu
              appMenuItems={[]}
              onSignout={() => authContext.logout()}
              viewer={authContext.viewer}
            />
          )}
          <div className="flex items-center gap-4 pl-6">
            {breadcrumbs && (
              <Breadcrumb className="hidden md:flex">
                <BreadcrumbList>
                  {breadcrumbs.map((breadcrumb, i) => (
                    <React.Fragment key={i}>
                      <BreadcrumbItem>
                        {breadcrumb.href ? (
                          <BreadcrumbLink asChild>
                            <Link to={breadcrumb.href}>{breadcrumb.label}</Link>
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                      {i !== breadcrumbs.length - 1 ? (
                        <BreadcrumbSeparator />
                      ) : null}
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </div>
        </div>
        {authContext.viewer && (
          <div className="flex flex-1 items-center justify-end gap-2">
            <ModeToggle />
            <UserNav
              onSignout={() => authContext.logout()}
              viewer={authContext.viewer}
            />
          </div>
        )}
      </div>
    </header>
  )
}
