import type { UserDTO } from '@lombokapp/types'
import type { LucideIcon } from 'lucide-react'
import {
  AppWindow,
  ChartLine,
  FileText,
  LayoutGrid,
  ListChecks,
  Settings,
  Users,
} from 'lucide-react'

import { DockerIcon } from '@/src/components/icons/docker-icon'

interface Submenu {
  href: string
  label: string
  active?: boolean
}

export interface Menu {
  href: string
  label: string
  active?: boolean
  submenus?: Submenu[]
  // LucideIcon when set by platform code, ReactNode when rendered from an
  // app contribution. CollapseMenuButton only accepts LucideIcon, so app
  // contributions must never carry submenus.
  icon: LucideIcon | React.ReactNode
}

export interface Group {
  groupLabel: string
  menus: Menu[]
}

export function getMenuList(
  pathname: string | undefined,
  viewer: UserDTO,
): Group[] {
  return [
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
                active: pathname?.startsWith('/server/users'),
                label: 'Users',
                icon: Users,
              },
              {
                href: '/server/apps',
                active: pathname?.startsWith('/server/apps'),
                label: 'Apps',
                icon: AppWindow,
              },
              {
                href: '/server/docker',
                active: pathname?.startsWith('/server/docker'),
                label: 'Docker',
                icon: DockerIcon,
              },
              {
                href: '/server/events',
                active: pathname?.startsWith('/server/events'),
                label: 'Events',
                icon: ChartLine,
              },
              {
                href: '/server/tasks',
                active: pathname?.startsWith('/server/tasks'),
                label: 'Tasks',
                icon: ListChecks,
              },
              {
                href: '/server/logs',
                active: pathname?.startsWith('/server/logs'),
                label: 'Logs',
                icon: FileText,
              },
              {
                href: '/server/settings',
                active: pathname?.startsWith('/server/settings'),
                label: 'Settings',
                icon: Settings,
              },
            ],
          },
        ]
      : []),
  ]
}
