import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@stellariscloud/ui-toolkit'
import Link from 'next/link'
import React from 'react'

import { ModeToggle } from '../../mode-toggle/mode-toggle'
import { SheetMenu } from './sheet-menu'
import { UserNav } from './user-nav'

interface NavbarProps {
  breadcrumbs?: { href?: string; label: string }[]
  onSignout: () => Promise<void>
}

export function Navbar({ breadcrumbs, onSignout }: NavbarProps) {
  return (
    <header className="sticky top-0 z-10 w-full border-b bg-background/95 py-2 supports-[backdrop-filter]:bg-background/60 dark:shadow-foreground/10">
      <div className="mx-4 flex h-8 items-center sm:mx-8">
        <div className="flex items-center space-x-4 lg:space-x-0">
          <SheetMenu onSignout={onSignout} />
          <div className="flex items-center gap-4 pl-6">
            {breadcrumbs && (
              <Breadcrumb className="hidden md:flex">
                <BreadcrumbList>
                  {breadcrumbs.map((breadcrumb, i) => (
                    <React.Fragment key={i}>
                      <BreadcrumbItem>
                        {breadcrumb.href ? (
                          <BreadcrumbLink asChild>
                            <Link href={breadcrumb.href}>
                              {breadcrumb.label}
                            </Link>
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
        <div className="flex flex-1 items-center justify-end gap-2">
          <ModeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  )
}
