import { useAuthContext } from '@lombokapp/auth-utils'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@lombokapp/ui-toolkit/components/breadcrumb'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import React from 'react'
import { Link } from 'react-router'

import { ModeToggle } from '../../mode-toggle/mode-toggle'
import { SheetMenu } from './sheet-menu'
import { UserNav } from './user-nav'

interface NavbarProps {
  breadcrumbs?: { href?: string; label: string }[]
}

export function Navbar({ breadcrumbs }: NavbarProps) {
  const authContext = useAuthContext()
  return (
    <header className="sticky top-0 z-10 w-full border-b bg-background/[.95] py-2 supports-[backdrop-filter]:bg-background/60 dark:shadow-foreground/10">
      <div className="flex h-8 w-full flex-1">
        <div className="flex flex-1 items-center truncate">
          {authContext.viewer && (
            <SheetMenu
              sidebarMenuContributions={[]}
              onSignout={() => authContext.logout()}
              viewer={authContext.viewer}
            />
          )}
          <div className="flex max-w-full flex-1 grow items-center pl-14 lg:-ml-0">
            {breadcrumbs && (
              <Breadcrumb className="hidden w-full md:flex">
                <BreadcrumbList className="w-full max-w-full flex-nowrap">
                  {breadcrumbs.map((breadcrumb, i) => (
                    <React.Fragment key={i}>
                      <BreadcrumbItem
                        className={cn(
                          'block',
                          i === breadcrumbs.length - 1 && 'truncate',
                        )}
                      >
                        {breadcrumb.href ? (
                          <BreadcrumbLink asChild>
                            <Link to={breadcrumb.href} className="truncate">
                              {breadcrumb.label}
                            </Link>
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage className="block w-full">
                            {breadcrumb.label}
                          </BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                      {i !== breadcrumbs.length - 1 ? (
                        <BreadcrumbSeparator className="shrink-0" />
                      ) : null}
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </div>
        </div>
        {authContext.viewer && (
          <div className="flex shrink-0 items-center justify-end gap-2 px-2">
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
