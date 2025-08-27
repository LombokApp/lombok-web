import type { IAuthContext } from '@lombokapp/auth-utils'
import { Button, cn } from '@lombokapp/ui-toolkit'
import { Link } from 'react-router-dom'

import type { AppRouteLinkContribution } from '../../contexts/server'
import { useStore } from '../../hooks/use-store'
import { Menu } from './components/menu'
import { SidebarToggle } from './components/sidebar-toggle'
import { useSidebar } from './use-sidebar'

export function Sidebar({
  onSignOut,
  authContext,
  sidebarMenuLinkContributions,
}: {
  onSignOut: () => Promise<void>
  authContext: IAuthContext
  sidebarMenuLinkContributions: AppRouteLinkContribution[]
}) {
  const sidebar = useStore(useSidebar, (x) => x)
  if (!sidebar) {
    return null
  }
  const { isOpen, toggleOpen, getOpenState, setIsHover, settings } = sidebar
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-20 h-screen -translate-x-full transition-[width] duration-300 ease-in-out lg:translate-x-0',
        !getOpenState() ? 'w-[70px]' : 'w-64',
        settings.disabled && 'hidden',
      )}
    >
      <SidebarToggle isOpen={isOpen} setIsOpen={toggleOpen} />
      <div
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        className="relative flex h-screen flex-col overflow-y-auto border-r shadow-md dark:shadow-zinc-900"
      >
        <div className="border-b bg-black/5 pb-0 pl-4 pr-2 pt-1">
          <Button
            className={cn(
              'mb-1 justify-start pl-2 transition-transform duration-300 ease-in-out',
            )}
            variant="link"
            asChild
          >
            <Link to="/folders" className="flex gap-4 p-0">
              <img
                className="rounded-full"
                src="/logo.png"
                width={24}
                height={24}
                alt="Lombok logo"
              />
              <h1
                className={cn(
                  'whitespace-nowrap text-lg font-bold transition-[transform,opacity,display] duration-300 ease-in-out',
                  !getOpenState()
                    ? 'hidden -translate-x-96 opacity-0'
                    : 'translate-x-0 opacity-100',
                )}
              >
                Lombok
              </h1>
            </Link>
          </Button>
        </div>
        <div className="h-full overflow-hidden p-0">
          {authContext.viewer && (
            <Menu
              viewer={authContext.viewer}
              isOpen={getOpenState()}
              onSignOut={onSignOut}
              sidebarMenuLinkContributions={sidebarMenuLinkContributions}
            />
          )}
        </div>
      </div>
    </aside>
  )
}
