import type { IAuthContext } from '@lombokapp/auth-utils'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import { Link } from 'react-router'

import type { AppPathContribution } from '../../contexts/server'
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
  sidebarMenuLinkContributions: AppPathContribution[]
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
      <div
        className={cn(
          'invisible absolute z-30 transition-all duration-300 ease-in-out lg:visible',
          getOpenState()
            ? 'left-[calc(100%-40px)] top-2'
            : 'left-[calc(50%-16px)] top-16',
        )}
      >
        <SidebarToggle isOpen={isOpen} setIsOpen={toggleOpen} />
      </div>
      <div
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        className="relative flex h-screen flex-col overflow-y-auto overflow-x-hidden border-r shadow-md dark:shadow-zinc-900"
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
                className="shrink-0 rounded-md border"
                src="/logo.png"
                width={24}
                height={24}
                alt="Lombok logo"
              />
              <span
                className={cn(
                  'grid overflow-hidden transition-[grid-template-columns] ease-in-out',
                  !getOpenState()
                    ? 'grid-cols-[0fr] duration-200'
                    : 'grid-cols-[1fr] duration-200',
                )}
              >
                <h1
                  className={cn(
                    'min-w-0 overflow-hidden whitespace-nowrap text-lg font-bold transition-opacity ease-in-out',
                    !getOpenState()
                      ? 'opacity-0 duration-150'
                      : 'opacity-100 duration-500',
                  )}
                >
                  Lombok
                </h1>
              </span>
            </Link>
          </Button>
        </div>
        <div
          className={cn(
            'shrink-0 transition-all duration-300 ease-in-out',
            getOpenState() ? 'h-0' : 'h-11',
          )}
        />
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
