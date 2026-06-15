import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@lombokapp/ui-toolkit/components/dropdown-menu'
import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'

import { useTheme } from '@/src/contexts/theme'

import { SidebarItem } from './sidebar-item'

interface ThemeToggleTriggerProps {
  isOpen: boolean | undefined
}

const THEME_META = {
  light: { icon: SunIcon, label: 'Light theme' },
  dark: { icon: MoonIcon, label: 'Dark theme' },
  system: { icon: MonitorIcon, label: 'System theme' },
} as const

type ThemeKey = keyof typeof THEME_META

function isThemeKey(value: string): value is ThemeKey {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function ThemeToggleTrigger({ isOpen }: ThemeToggleTriggerProps) {
  const { theme, setTheme } = useTheme()
  const isSidebarCollapsed = isOpen === false
  const active: ThemeKey = isThemeKey(theme) ? theme : 'system'
  const { icon, label } = THEME_META[active]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarItem
          icon={icon}
          label={label}
          isOpen={isOpen}
          asChild
          data-testid="theme-toggle"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={isSidebarCollapsed ? 'right' : 'top'}
        align="start"
        sideOffset={8}
        className="min-w-[10rem]"
      >
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <SunIcon className="mr-2 size-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <MoonIcon className="mr-2 size-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <MonitorIcon className="mr-2 size-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
