import type { IAuthContext } from '@lombokapp/auth-utils'
import { ScrollArea } from '@lombokapp/ui-toolkit/components/scroll-area'
import type { LucideIcon } from 'lucide-react'
import { useLocation } from 'react-router'

import type { AppPathContribution } from '@/src/contexts/server'
import { $api } from '@/src/services/api'

import { getMenuList } from '../menu-list'
import { CollapseMenuButton } from './collapse-menu-button'
import { NotificationsTrigger } from './notifications-trigger'
import { SidebarAppsSection } from './sidebar-apps-section'
import { SidebarFoldersSection } from './sidebar-folders-section'
import { SidebarGroup } from './sidebar-group'
import { SidebarItem } from './sidebar-item'
import { ThemeToggleTrigger } from './theme-toggle-trigger'
import { UserNav } from './user-nav'

interface MenuProps {
  isOpen: boolean | undefined
  viewer: NonNullable<IAuthContext['viewer']>
  appEntrypoints: AppPathContribution[]
}

export function Menu({
  onSignOut,
  isOpen,
  viewer,
  appEntrypoints,
}: { onSignOut: () => Promise<void> } & MenuProps) {
  const location = useLocation()
  const { data: starredFolders } = $api.useQuery(
    'get',
    '/api/v1/folders/starred',
  )
  const menuList = getMenuList(location.pathname, viewer)
  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="h-full flex-1 overflow-x-visible [&>div>div[style]]:!block">
        <nav className="size-full py-2">
          <ul className="flex h-full flex-col items-start space-y-1">
            {/* Folders (with starred shortcuts) and Apps lead; admin Server
                groups follow from getMenuList. */}
            <SidebarFoldersSection
              folders={starredFolders?.folders ?? []}
              isOpen={isOpen}
            />
            <SidebarAppsSection entrypoints={appEntrypoints} isOpen={isOpen} />
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
                    // CollapseMenuButton only accepts LucideIcon (component
                    // ref — forwardRef object or plain function). App
                    // contributions never set submenus, so this only fires
                    // for platform-defined menus.
                    (typeof icon === 'function' ||
                      (typeof icon === 'object' &&
                        icon !== null &&
                        '$$typeof' in icon)) && (
                      <CollapseMenuButton
                        key={_index}
                        icon={icon as LucideIcon}
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
      <div className="space-y-1 border-t px-3 pb-2 pt-2">
        <NotificationsTrigger isOpen={isOpen} />
        <ThemeToggleTrigger isOpen={isOpen} />
        <UserNav viewer={viewer} onSignout={onSignOut} isOpen={isOpen} />
      </div>
    </div>
  )
}
