import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import { PanelLeftClose } from 'lucide-react'

interface SidebarToggleProps {
  isOpen: boolean | undefined
  setIsOpen?: () => void
}

export function SidebarToggle({ isOpen, setIsOpen }: SidebarToggleProps) {
  return (
    <Button
      onClick={() => setIsOpen?.()}
      className="size-8 shrink-0 rounded-md"
      variant="outline"
      size="icon"
    >
      <PanelLeftClose
        className={cn(
          'size-4 opacity-50 transition-transform duration-700 ease-in-out',
          isOpen === false ? 'rotate-180' : 'rotate-0',
        )}
      />
    </Button>
  )
}
