import { Bell } from 'lucide-react'
import React from 'react'

import { NotificationsPopover } from '@/src/components/notifications/notifications-popover'
import { $api } from '@/src/services/api'

import { SidebarItem } from './sidebar-item'

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

  return (
    <NotificationsPopover
      isOpen={popoverOpen}
      onOpenChange={setPopoverOpen}
      isSidebarCollapsed={isSidebarCollapsed}
    >
      <SidebarItem
        icon={Bell}
        label="Notifications"
        isOpen={isOpen}
        badge={unreadCount > 0}
        asChild
      />
    </NotificationsPopover>
  )
}
