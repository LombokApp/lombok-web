import type { components } from '@lombokapp/types'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@lombokapp/ui-toolkit/components/popover'
import { ScrollArea } from '@lombokapp/ui-toolkit/components/scroll-area/scroll-area'
import { Skeleton } from '@lombokapp/ui-toolkit/components/skeleton'
import { useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import React from 'react'

import { $api } from '@/src/services/api'

import { NotificationItem } from './notification-item'

type NotificationDTO = components['schemas']['NotificationDTO']

interface NotificationsPopoverProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  isSidebarCollapsed?: boolean
  children: React.ReactNode
}

export function NotificationsPopover({
  isOpen,
  onOpenChange,
  isSidebarCollapsed = false,
  children,
}: NotificationsPopoverProps) {
  const queryClient = useQueryClient()
  const [cursor, setCursor] = React.useState<string | undefined>()

  const {
    data: listData,
    isLoading,
    error,
  } = $api.useQuery(
    'get',
    '/api/v1/notifications',
    {
      params: {
        query: {
          limit: 20,
          sort: 'createdAt-desc',
          cursor,
        },
      },
    },
    {
      enabled: isOpen,
      refetchOnWindowFocus: isOpen,
    },
  )

  const [accumulatedNotifications, setAccumulatedNotifications] =
    React.useState<NotificationDTO[]>([])

  React.useEffect(() => {
    if (isOpen && listData?.notifications) {
      if (!cursor) {
        setAccumulatedNotifications(listData.notifications)
      } else {
        setAccumulatedNotifications((prev) => [
          ...prev,
          ...listData.notifications,
        ])
      }
    }
  }, [isOpen, listData?.notifications, cursor])

  React.useEffect(() => {
    if (!isOpen) {
      setCursor(undefined)
      setAccumulatedNotifications([])
    }
  }, [isOpen])

  const markAsReadMutation = $api.useMutation(
    'patch',
    '/api/v1/notifications/{id}/read',
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: ['get', '/api/v1/notifications'],
        })
        void queryClient.invalidateQueries({
          queryKey: ['get', '/api/v1/notifications/unread-count'],
        })
      },
    },
  )

  const handleMarkAsRead = React.useCallback(
    (id: string) => {
      markAsReadMutation.mutate({ params: { path: { id } } })
    },
    [markAsReadMutation],
  )

  const notifications = accumulatedNotifications
  const nextCursor = listData?.nextCursor

  const loadMore = React.useCallback(() => {
    if (nextCursor) {
      setCursor(nextCursor)
    }
  }, [nextCursor])

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align={isSidebarCollapsed ? 'start' : 'center'}
        side={isSidebarCollapsed ? 'right' : 'bottom'}
        sideOffset={8}
        className="w-80 overflow-hidden rounded-xl border bg-popover p-0 shadow-xl"
      >
        <div className="flex min-h-0 flex-col">
          <div className="shrink-0 border-b bg-muted/30 px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Bell className="size-4 text-primary" />
              </span>
              <h3 className="font-semibold tracking-tight text-foreground">
                Notifications
              </h3>
            </div>
          </div>
          <ScrollArea className="h-[360px] shrink-0">
            <div className="flex size-full flex-col py-1">
              {isLoading ? (
                <div className="space-y-1.5 px-2 py-3">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ) : error ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Unable to load notifications.
                  <br />
                  <span className="text-xs">Please try again later.</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-muted/60">
                    <Bell className="size-5 text-muted-foreground" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">
                      No notifications yet
                    </p>
                    <p className="text-xs text-muted-foreground">
                      We&apos;ll let you know when something happens
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex size-full flex-col gap-1 px-1">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      isRead={notification.readAt != null}
                    />
                  ))}
                  {listData?.nextCursor != null && (
                    <div className="border-t p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        onClick={loadMore}
                        disabled={isLoading}
                      >
                        {
                          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                          isLoading ? 'Loading...' : 'Load more'
                        }
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )
}
