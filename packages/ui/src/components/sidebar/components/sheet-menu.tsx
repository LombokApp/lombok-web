import type { IAuthContext } from '@stellariscloud/auth-utils'
import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@stellariscloud/ui-toolkit'
import { MenuIcon, PanelsTopLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { AppMenuLink } from '@/src/contexts/server.context'

import { Menu } from './menu'

export function SheetMenu({
  onSignout,
  viewer,
  appMenuItems,
}: {
  onSignout: () => Promise<void>
  viewer: NonNullable<IAuthContext['viewer']>
  appMenuItems: AppMenuLink[]
}) {
  return (
    <Sheet>
      <SheetTrigger className="fixed ml-2 lg:hidden" asChild>
        <Button className="h-8" variant="outline" size="icon">
          <MenuIcon size={20} />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex h-full flex-col px-3 sm:w-72" side="left">
        <SheetHeader>
          <Button
            className="flex items-center justify-center pb-2 pt-1"
            variant="link"
            asChild
          >
            <Link to="/dashboard" className="flex items-center gap-2">
              <PanelsTopLeft className="mr-1 size-6" />
              <SheetTitle className="text-lg font-bold">Brand</SheetTitle>
            </Link>
          </Button>
        </SheetHeader>
        <Menu
          isOpen
          onSignOut={onSignout}
          sidebarMenuLinkContributions={appMenuItems}
          viewer={viewer}
        />
      </SheetContent>
    </Sheet>
  )
}
