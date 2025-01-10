import { Button, cn } from '@stellariscloud/ui-toolkit'
import { PanelLeftClose } from 'lucide-react'

interface SidebarToggleProps {
  isOpen: boolean | undefined
  setIsOpen?: () => void
}

export function SidebarToggle({ isOpen, setIsOpen }: SidebarToggleProps) {
  return (
    <div className="invisible absolute right-[-42px] top-[8px] z-20 lg:visible">
      <Button
        onClick={() => setIsOpen?.()}
        className="size-8 rounded-md"
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
    </div>
  )
}
