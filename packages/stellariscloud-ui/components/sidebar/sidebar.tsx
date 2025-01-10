'use client'
import type { IAuthContext } from '@stellariscloud/auth-utils'
import { Button, cn } from '@stellariscloud/ui-toolkit'
import Image from 'next/image'
import Link from 'next/link'
import type { NextRouter } from 'next/router'

import type { AppMenuItemAndHref } from '../../contexts/server.context'
import { useStore } from '../../hooks/use-store'
import { Menu } from './components/menu'
import { SidebarToggle } from './components/sidebar-toggle'
import { useSidebar } from './use-sidebar'

export function Sidebar({
  onSignOut,
  // menuItems,
}: {
  onSignOut: () => Promise<void>
  authContext: IAuthContext
  menuItems: AppMenuItemAndHref[]
  router: NextRouter
}) {
  const sidebar = useStore(useSidebar, (x) => x)
  if (!sidebar) {
    return null
  }
  const { isOpen, toggleOpen, getOpenState, setIsHover, settings } = sidebar
  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-20 h-screen -translate-x-full lg:translate-x-0 transition-[width] ease-in-out duration-300',
        !getOpenState() ? 'w-[70px]' : 'w-64',
        settings.disabled && 'hidden',
      )}
    >
      <SidebarToggle isOpen={isOpen} setIsOpen={toggleOpen} />
      <div
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        className="relative flex h-screen flex-col overflow-y-auto border-r shadow-md dark:border-foreground/5 dark:shadow-zinc-900"
      >
        <div className="border-b bg-black/5 pb-0 pl-4 pr-2 pt-1">
          <Button
            className={cn(
              'transition-transform ease-in-out duration-300 mb-1 justify-start pl-2',
            )}
            variant="link"
            asChild
          >
            <Link href="/folders" className="flex gap-4 p-0">
              <Image
                className="rounded-full"
                priority
                src="/stellariscloud.png"
                width={24}
                height={24}
                alt="Stellaris Cloud logo"
              />
              <h1
                className={cn(
                  'font-bold text-lg whitespace-nowrap transition-[transform,opacity,display] ease-in-out duration-300',
                  !getOpenState()
                    ? '-translate-x-96 opacity-0 hidden'
                    : 'translate-x-0 opacity-100',
                )}
              >
                Stellaris Cloud
              </h1>
            </Link>
          </Button>
        </div>
        <div className="h-full overflow-hidden p-0 px-3">
          <Menu isOpen={getOpenState()} onSignOut={onSignOut} />
        </div>
      </div>
    </aside>
  )
}
