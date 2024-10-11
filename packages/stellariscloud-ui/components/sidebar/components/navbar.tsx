import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@stellariscloud/ui-toolkit'
import { ModeToggle } from './mode-toggle'
import { SheetMenu } from './sheet-menu'
import { UserNav } from './user-nav'
import { Type } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

interface NavbarProps {
  titleIcon: typeof Type
  description?: string
  breadcrumbs?: { href?: string; label: string }[]
}

interface PageHeadingProps {
  title: string
  titleIcon: typeof Type
  description?: string
}

export function PageHeading({
  title,
  titleIcon: TitleIcon,
  description,
}: PageHeadingProps) {
  return (
    <div className="flex items-center gap-2">
      {TitleIcon && (
        <div className="bg-foreground/5 rounded-full p-2">
          <TitleIcon className="w-6 h-6 stroke-foreground/50" />
        </div>
      )}
      {description ? (
        <div className="flex flex-col">
          <h1 className="font-bold">{title}</h1>
          <div className="opacity-50">{description}</div>
        </div>
      ) : (
        <h1 className="font-bold">{title}</h1>
      )}
    </div>
  )
}

export function Navbar({
  titleIcon: TitleIcon,
  description,
  breadcrumbs,
}: NavbarProps) {
  return (
    <header className="py-2 sticky top-0 z-10 w-full bg-background/95 border-b supports-[backdrop-filter]:bg-background/60 dark:shadow-foreground/10">
      <div className="mx-4 sm:mx-8 flex h-12 items-center">
        <div className="flex items-center space-x-4 lg:space-x-0">
          <SheetMenu />
          <div className="flex items-center gap-4">
            {TitleIcon && (
              <div className="bg-foreground/5 rounded-full p-2">
                <TitleIcon className="w-6 h-6 stroke-foreground/50" />
              </div>
            )}
            <div className="flex flex-col">
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
              {description && (
                <div className="opacity-40 text-sm">{description}</div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-end">
          <ModeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  )
}
