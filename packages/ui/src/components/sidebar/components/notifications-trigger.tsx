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

interface NotificationsTriggerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  sidebarIsOpen: boolean | undefined
  isSidebarCollapsed: boolean
  unreadCount: number
}

const NotificationsTriggerButton = React.forwardRef<
  HTMLButtonElement,
  NotificationsTriggerButtonProps
>(
  (
    {
      sidebarIsOpen,
      isSidebarCollapsed,
      unreadCount,
      className,
      ...buttonProps
    },
    ref,
  ) => {
    const triggerContent = (
      <Button
        ref={ref}
        variant="ghost"
        className={cn(
          'relative h-9 w-full px-2 font-normal',
          sidebarIsOpen ? 'justify-start' : 'justify-center',
          'text-foreground/70 hover:bg-accent/50 hover:text-accent-foreground',
          className,
        )}
        {...buttonProps}
      >
        <span className={cn(sidebarIsOpen && 'mr-3')}>
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span
              className="absolute right-0 top-0 m-4 size-2 rounded-full bg-destructive"
              aria-label={`${unreadCount} unread notifications`}
            />
          )}
        </span>
        {sidebarIsOpen && <span className="text-sm">Notifications</span>}
      </Button>
    )

    if (isSidebarCollapsed) {
      return (
        <TooltipProvider disableHoverableContent>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>{triggerContent}</TooltipTrigger>
            <TooltipContent side="right">Notifications</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return triggerContent
  },
)
NotificationsTriggerButton.displayName = 'NotificationsTriggerButton'

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

  return (
    <NotificationsPopover
      isOpen={popoverOpen}
      onOpenChange={setPopoverOpen}
      isSidebarCollapsed={isSidebarCollapsed}
    >
      <NotificationsTriggerButton
        sidebarIsOpen={isOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        unreadCount={unreadCount}
      />
    </NotificationsPopover>
  )
}
