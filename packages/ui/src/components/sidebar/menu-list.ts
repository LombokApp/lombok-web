import type { UserDTO } from '@lombokapp/types'
import type { LucideIcon } from 'lucide-react'
import {
  AppWindow,
  Box,
  ChartLine,
  FileText,
  Folders,
  LayoutGrid,
  ListChecks,
  Server,
  Settings,
  Users,
} from 'lucide-react'

import type { AppPathContribution } from '@/src/contexts/server'

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
  icon: LucideIcon | string
}

export interface Group {
  groupLabel: string
  menus: Menu[]
}

const protocol = window.location.protocol
const hostname = window.location.hostname
const port = window.location.port
const API_HOST = `${hostname}${port && !['80', '443'].includes(port) ? `:${port}` : ''}`

function resolveAppIconUrl(appIdentifier: string, iconPath: string): string {
  return `${protocol}//${appIdentifier}.apps.${API_HOST}${iconPath}`
}

function groupContributionsByApp(
  contributions: AppPathContribution[],
  pathname: string | undefined,
): Group[] {
  const byApp = new Map<string, { appLabel: string; menus: Menu[] }>()

  for (const item of contributions) {
    let group = byApp.get(item.appIdentifier)
    if (!group) {
      group = { appLabel: item.appLabel, menus: [] }
      byApp.set(item.appIdentifier, group)
    }
    group.menus.push({
      href: item.href,
      active: pathname === item.href,
      label: item.label,
      icon: item.iconPath
        ? resolveAppIconUrl(item.appIdentifier, item.iconPath)
        : Box,
    })
  }

  return Array.from(byApp.values()).map((group) => ({
    groupLabel: group.appLabel,
    menus: group.menus,
  }))
}

export function getMenuList(
  pathname: string | undefined,
  viewer: UserDTO,
  sidebarMenuLinkContributions: AppPathContribution[],
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
      ],
    },
    ...groupContributionsByApp(sidebarMenuLinkContributions, pathname),
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
                icon: Server,
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
