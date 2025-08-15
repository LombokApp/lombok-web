import type { UserDTO } from '@stellariscloud/types'
import type { LucideIcon } from 'lucide-react'
import {
  AppWindow,
  Box,
  ChartLine,
  FileText,
  Folders,
  KeySquare,
  LayoutGrid,
  ListChecks,
  Settings,
  Users,
} from 'lucide-react'

import type { AppMenuItemAndHref } from '@/src/contexts/server.context'

interface Submenu {
  href: string
  label: string
  active?: boolean
}

interface Menu {
  href: string
  label: string
  active?: boolean
  submenus?: Submenu[]
  icon: LucideIcon | string
  context?: Record<string, string>
}

interface Group {
  groupLabel: string
  menus: Menu[]
}

export function getMenuList(
  pathname: string | undefined,
  viewer: UserDTO,
  appMenuItems: AppMenuItemAndHref[],
): Group[] {
  return [
    {
      groupLabel: '',
      menus: [
        {
          href: '/folders',
          label: 'All Folders',
          icon: Folders,
        },
        {
          href: '/access-keys',
          label: 'Access Keys',
          icon: KeySquare,
        },
      ],
    },
    ...(viewer.isAdmin
      ? [
          {
            groupLabel: 'Server',
            menus: [
              {
                href: '/server',
                active: pathname === '/server',
                label: 'Overview',
                icon: LayoutGrid,
              },
              {
                href: '/server/users',
                label: 'Users',
                icon: Users,
              },
              {
                href: '/server/apps',
                label: 'Apps',
                icon: AppWindow,
              },
              {
                href: '/server/events',
                label: 'Events',
                icon: ChartLine,
              },
              {
                href: '/server/tasks',
                label: 'Tasks',
                icon: ListChecks,
              },
              {
                href: '/server/logs',
                label: 'Logs',
                icon: FileText,
              },
              {
                href: '/server/settings',
                label: 'Settings',
                icon: Settings,
              },
            ],
          },
        ]
      : []),
    ...(appMenuItems.length > 0
      ? [
          {
            groupLabel: 'Apps',
            menus: appMenuItems.map((item) => ({
              href: item.href,
              label: item.label,
              icon: item.iconPath ? item.iconPath : Box,
              context: {
                uiIdentifier: item.uiIdentifier,
                appIdentifier: item.appIdentifier,
                appLabel: item.appLabel,
              },
            })),
          },
        ]
      : []),
  ]
}
