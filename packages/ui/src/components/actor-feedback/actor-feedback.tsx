import { PLATFORM_IDENTIFIER } from '@stellariscloud/types'

import { invertColour, stringToColour } from '@/src/utils/colors'

interface ActorFeedbackProps {
  actorIdentifier: string
  title: string
  showSubtitle?: boolean
  subtitle?: string
  children?: React.ReactNode
}

export function ActorFeedback({
  actorIdentifier,
  title,
  showSubtitle = false,
  subtitle,
  children,
}: ActorFeedbackProps) {
  return (
    <div className="flex items-start gap-2">
      <div
        className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full"
        style={{
          background: actorIdentifier.includes(':')
            ? stringToColour(actorIdentifier.split(':')[1] ?? '')
            : '',
          color: actorIdentifier.includes(':')
            ? invertColour(stringToColour(actorIdentifier))
            : undefined,
        }}
      >
        {actorIdentifier === PLATFORM_IDENTIFIER ? (
          <img width={30} height={30} alt="Core" src="/stellariscloud.png" />
        ) : (
          <span className="truncate uppercase">
            {actorIdentifier.split(':')[1]?.[0] ?? ''}
          </span>
        )}
      </div>

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
