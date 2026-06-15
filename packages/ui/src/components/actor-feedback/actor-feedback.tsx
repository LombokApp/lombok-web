import { CORE_IDENTIFIER } from '@lombokapp/types'

import { useServerContext } from '@/src/contexts/server'
import { invertColour, stringToColour } from '@/src/utils/colors'

import { AppIcon, iconRendersAsGlyph } from '../app-icon'
import { ServerLogo } from '../server-logo/server-logo'

interface ActorFeedbackProps {
  actorIdentifier: string
  title: string
  showSubtitle?: boolean
  subtitle?: string
  children?: React.ReactNode
  // Escape hatch: render this in the avatar slot instead of the automatic
  // colored-initial / app-icon resolution. Pass-through is used by callers
  // that already have richer avatar information (e.g. user profile picture).
  avatar?: React.ReactNode
}

export function ActorFeedback({
  actorIdentifier,
  title,
  showSubtitle = false,
  subtitle,
  children,
  avatar,
}: ActorFeedbackProps) {
  const { getAppIcon } = useServerContext()
  const isCore = actorIdentifier === CORE_IDENTIFIER
  const appIcon = !isCore ? getAppIcon(actorIdentifier) : undefined
  const hasAppIcon = !!appIcon
  const renderAppIconAsGlyph = hasAppIcon ? iconRendersAsGlyph(appIcon) : false

  let avatarNode: React.ReactNode
  if (avatar) {
    avatarNode = (
      <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden">
        {avatar}
      </div>
    )
  } else if (hasAppIcon) {
    avatarNode = renderAppIconAsGlyph ? (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-foreground/[0.02]">
        <AppIcon
          icon={appIcon}
          appIdentifier={actorIdentifier}
          fallbackLabel={title}
          size={24}
        />
      </div>
    ) : (
      <div className="flex size-8 shrink-0 items-center justify-center">
        <AppIcon
          icon={appIcon}
          appIdentifier={actorIdentifier}
          fallbackLabel={title}
          size={32}
        />
      </div>
    )
  } else {
    avatarNode = (
      <div
        className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full"
        style={{
          background: stringToColour(actorIdentifier),
          color: actorIdentifier
            ? invertColour(stringToColour(actorIdentifier))
            : undefined,
        }}
      >
        {isCore ? (
          <ServerLogo size="sm" className="size-8" alt="Core" />
        ) : (
          <span className="truncate uppercase">{actorIdentifier[0] ?? ''}</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2">
      {avatarNode}

      <div className="flex min-w-0 flex-col">
        <div className="truncate font-medium">{children || title}</div>
        {showSubtitle && (
          <span className="truncate text-xs text-muted-foreground">
            {subtitle || actorIdentifier}
          </span>
        )}
      </div>
    </div>
  )
}
