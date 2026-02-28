import type { IAuthContext } from '@lombokapp/auth-utils'
import { ScrollArea } from '@lombokapp/ui-toolkit/components/scroll-area/scroll-area'
import { LogOut } from 'lucide-react'
import { useLocation } from 'react-router'

import type { AppPathContribution } from '@/src/contexts/server'

import { getMenuList } from '../menu-list'
import { CollapseMenuButton } from './collapse-menu-button'
import { NotificationsTrigger } from './notifications-trigger'
import { SidebarGroup } from './sidebar-group'
import { SidebarItem } from './sidebar-item'

interface MenuProps {
  isOpen: boolean | undefined
  viewer: NonNullable<IAuthContext['viewer']>
  sidebarMenuLinkContributions: AppPathContribution[]
}

export function Menu({
  onSignOut,
  isOpen,
  viewer,
  sidebarMenuLinkContributions,
}: { onSignOut: () => Promise<void> } & MenuProps) {
  const location = useLocation()
  const menuList = getMenuList(
    location.pathname,
    viewer,
    sidebarMenuLinkContributions,
  )
  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="h-full flex-1 overflow-x-visible [&>div>div[style]]:!block">
        <nav className="size-full py-2">
          <ul className="flex h-full flex-col items-start space-y-1">
            {menuList.map(({ groupLabel, menus }, index) => (
              <SidebarGroup key={index} label={groupLabel}>
                {menus.map(({ href, label, icon, active, submenus }, _index) =>
                  !submenus || submenus.length === 0 ? (
                    <SidebarItem
                      key={_index}
                      icon={icon}
                      label={label}
                      isOpen={isOpen}
                      active={active}
                      href={href}
                    />
                  ) : (
                    typeof icon !== 'string' && (
                      <CollapseMenuButton
                        key={_index}
                        icon={icon}
                        label={label}
                        active={
                          active === undefined
                            ? location.pathname.startsWith(href)
                            : active
                        }
                        submenus={submenus}
                        isOpen={isOpen}
                      />
                    )
                  ),
                )}
              </SidebarGroup>
            ))}
          </ul>
        </nav>
      </ScrollArea>
      <div className="space-y-1 px-3 pb-2">
        <NotificationsTrigger isOpen={isOpen} />
        <SidebarItem
          icon={LogOut}
          label="Sign out"
          isOpen={isOpen}
          onClick={() => void onSignOut()}
        />
      </div>
    </div>
  )
}
