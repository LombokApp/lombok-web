import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@lombokapp/ui-toolkit/components/dropdown-menu/dropdown-menu'
import { MoonIcon, SunIcon } from 'lucide-react'

import { useTheme } from '@/src/contexts/theme'

export function ModeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" data-testid="theme-toggle">
          <SunIcon className="dark:-rotate-90 dark:scale-0 size-4 rotate-0 scale-100 transition-all" />
          <MoonIcon className="dark:rotate-0 dark:scale-100 absolute size-4 rotate-90 scale-0 transition-all" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
