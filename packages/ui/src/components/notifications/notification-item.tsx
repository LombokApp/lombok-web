import type { components } from '@lombokapp/types'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import { formatDistanceToNow } from 'date-fns'
import { Inbox } from 'lucide-react'
import { Link } from 'react-router'

type NotificationDTO = components['schemas']['NotificationDTO']

interface NotificationItemProps {
  notification: NotificationDTO
  onMarkAsRead: (id: string) => void
  isRead: boolean
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  isRead,
}: NotificationItemProps) {
  const handleClick = () => {
    if (!isRead) {
      onMarkAsRead(notification.id)
    }
  }

  const {
    title: notificationTitle,
    body,
    image,
    path,
  } = notification as NotificationDTO & {
    title?: string
    body?: string | null
    image?: string | null
    path?: string | null
  }
  const title = notificationTitle
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
  })

  const href =
    path ??
    (notification.targetLocationFolderId != null
      ? notification.targetLocationObjectKey != null
        ? `/folders/${notification.targetLocationFolderId}?object=${encodeURIComponent(notification.targetLocationObjectKey)}`
        : `/folders/${notification.targetLocationFolderId}`
      : undefined)

  const content = (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      {image != null ? (
        <img
          src={image}
          alt=""
          className="size-10 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span
          className={cn(
            'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
            isRead
              ? 'bg-muted/50 text-muted-foreground'
              : 'bg-primary/10 text-primary',
          )}
        >
          <Inbox className="size-4" />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-0.5">
        <span
          className={cn(
            'line-clamp-2 text-sm leading-snug',
            isRead
              ? 'font-normal text-muted-foreground'
              : 'font-medium text-foreground',
          )}
        >
          {title}
        </span>
        {body != null && body.length > 0 && (
          <span className="line-clamp-2 text-xs text-muted-foreground">
            {body}
          </span>
        )}
        <span className="text-xs text-muted-foreground/90">{timeAgo}</span>
      </div>
    </div>
  )

  const className = cn(
    'group relative flex w-full cursor-pointer items-start rounded-lg px-4 py-2.5 text-left transition-all',
    'hover:bg-accent/70 active:bg-accent',
    !isRead && 'bg-primary/[0.04]',
  )

  if (href) {
    return (
      <Link to={href} className={className} onClick={handleClick}>
        {!isRead && (
          <span
            className="absolute left-0 top-1/2 ml-1 size-1.5 -translate-y-1/2 rounded-full bg-primary/50"
            aria-hidden
          />
        )}
        {content}
      </Link>
    )
  }

  return (
    <button type="button" className={className} onClick={handleClick}>
      {!isRead && (
        <span
          className="absolute left-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-primary"
          aria-hidden
        />
      )}
      {content}
    </button>
  )
}
