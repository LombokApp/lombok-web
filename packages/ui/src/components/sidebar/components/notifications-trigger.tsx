import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@lombokapp/ui-toolkit/components/tooltip'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import { Bell } from 'lucide-react'
import React from 'react'

import { NotificationsPopover } from '@/src/components/notifications/notifications-popover'
import { $api } from '@/src/services/api'

interface NotificationsTriggerProps {
  isOpen: boolean | undefined
}

export function NotificationsTrigger({ isOpen }: NotificationsTriggerProps) {
  const [popoverOpen, setPopoverOpen] = React.useState(false)

  const { data: unreadData } = $api.useQuery(
    'get',
    '/api/v1/notifications/unread-count',
    {},
    {
      refetchInterval: 60_000,
      refetchOnWindowFocus: true,
    },
  )

  const unreadCount = (unreadData as { count?: number } | undefined)?.count ?? 0
  const isSidebarCollapsed = isOpen === false

  const triggerButton = (
    <Button
      variant="ghost"
      className={cn(
        'relative h-9 w-full px-2 font-normal',
        isOpen ? 'justify-start' : 'justify-center',
        'text-foreground/70 hover:bg-accent/50 hover:text-accent-foreground',
      )}
      onClick={() => setPopoverOpen((prev) => !prev)}
    >
      <span className={cn(isOpen && 'mr-3')}>
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span
            className="absolute right-0 top-0 m-4 size-2 rounded-full bg-destructive"
            aria-label={`${unreadCount} unread notifications`}
          />
        )}
      </span>
      {isOpen && <span className="text-sm">Notifications</span>}
    </Button>
  )

  return (
    <NotificationsPopover
      isOpen={popoverOpen}
      onOpenChange={setPopoverOpen}
      isSidebarCollapsed={isSidebarCollapsed}
    >
      {isSidebarCollapsed ? (
        <TooltipProvider disableHoverableContent>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
            <TooltipContent side="right">Notifications</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        triggerButton
      )}
    </NotificationsPopover>
  )
}
