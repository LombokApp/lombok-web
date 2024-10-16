'use client'
import { Menu } from './components/menu'
import { SidebarToggle } from './components/sidebar-toggle'
import { Button } from '@stellariscloud/ui-toolkit'
import { useSidebar } from './use-sidebar'
import { useStore } from '../../hooks/use-store'
import { cn } from '@/utils'
import Link from 'next/link'
import Image from 'next/image'
import { IAuthContext } from '@stellariscloud/auth-utils'
import { AppMenuItemAndHref } from '../../contexts/server.context'
import { NextRouter } from 'next/router'

export function Sidebar({
  onSignOut,
  menuItems,
}: {
  onSignOut: () => Promise<void>
  authContext: IAuthContext
  menuItems: AppMenuItemAndHref[]
  router: NextRouter
}) {
  const sidebar = useStore(useSidebar, (x) => x)
  if (!sidebar) return null
  const { isOpen, toggleOpen, getOpenState, setIsHover, settings } = sidebar
  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-20 h-screen -translate-x-full lg:translate-x-0 transition-[width] ease-in-out duration-300',
        !getOpenState() ? 'w-[70px]' : 'w-72',
        settings.disabled && 'hidden',
      )}
    >
      <SidebarToggle isOpen={isOpen} setIsOpen={toggleOpen} />
      <div
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        className="relative h-screen flex flex-col overflow-y-auto border-r shadow-md dark:shadow-zinc-900 dark:border-foreground/5"
      >
        <div className="bg-black/5 px-3 pt-3 pb-2 border-b">
          <Button
            className={cn(
              'transition-transform ease-in-out duration-300 mb-1 justify-start pl-2',
            )}
            variant="link"
            asChild
          >
            <Link href="/folders" className="flex gap-4 py-0 px-0">
              <Image
                className="rounded-full shrink-0"
                priority
                src="/stellariscloud.png"
                width={32}
                height={32}
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
        <div className="p-0 px-3 h-full overflow-hidden">
          <Menu isOpen={getOpenState()} onSignOut={onSignOut} />
        </div>
      </div>
    </aside>
  )
}
