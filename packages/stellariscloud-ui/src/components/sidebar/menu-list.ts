import type { LucideIcon } from 'lucide-react'
import {
  AppWindow,
  ChartLine,
  Folders,
  KeySquare,
  LayoutGrid,
  ListChecks,
  Settings,
  Users,
} from 'lucide-react'

interface Submenu {
  href: string
  label: string
  active?: boolean
}

interface Menu {
  href: string
  label: string
  active?: boolean
  icon: LucideIcon
  submenus?: Submenu[]
}

interface Group {
  groupLabel: string
  menus: Menu[]
}

export function getMenuList(pathname: string | undefined): Group[] {
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
          href: '/server/config',
          label: 'Config',
          icon: Settings,
        },
      ],
    },
  ]
}
