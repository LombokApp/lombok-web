import { PanelLeftClose } from 'lucide-react'

import { cn } from '@stellariscloud/ui-toolkit'
import { Button } from '@stellariscloud/ui-toolkit'

interface SidebarToggleProps {
  isOpen: boolean | undefined
  setIsOpen?: () => void
}

export function SidebarToggle({ isOpen, setIsOpen }: SidebarToggleProps) {
  return (
    <div className="invisible lg:visible absolute top-[8px] -right-[42px] z-20">
      <Button
        onClick={() => setIsOpen?.()}
        className="rounded-md w-8 h-8"
        variant="outline"
        size="icon"
      >
        <PanelLeftClose
          className={cn(
            'h-4 w-4 transition-transform ease-in-out duration-700 opacity-50',
            isOpen === false ? 'rotate-180' : 'rotate-0',
          )}
        />
      </Button>
    </div>
  )
}
