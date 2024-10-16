import {
  Users,
  Settings,
  KeySquare,
  ChartArea,
  AppWindow,
  Folders,
  LayoutGrid,
  LucideIcon,
} from 'lucide-react'

type Submenu = {
  href: string
  label: string
  active?: boolean
}

type Menu = {
  href: string
  label: string
  active?: boolean
  icon: LucideIcon
  submenus?: Submenu[]
}

type Group = {
  groupLabel: string
  menus: Menu[]
}

export function getMenuList(pathname: string): Group[] {
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
          href: '/server/dashboard',
          label: 'Dashboard',
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
          icon: ChartArea,
        },
        {
          href: '/server/settings',
          label: 'Settings',
          icon: Settings,
        },
      ],
    },
  ]
}
