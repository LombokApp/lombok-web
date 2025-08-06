import { invertColour, stringToColour } from '@/src/utils/colors'

interface ActorFeedbackProps {
  emitterIdentifier: string
  title: string
  showSubtitle?: boolean
  subtitle?: string
  children?: React.ReactNode
}

export function ActorFeedback({
  emitterIdentifier,
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
          background: emitterIdentifier.includes(':')
            ? stringToColour(emitterIdentifier.split(':')[1] ?? '')
            : '',
          color: emitterIdentifier.includes(':')
            ? invertColour(stringToColour(emitterIdentifier))
            : undefined,
        }}
      >
        {emitterIdentifier === 'core' || emitterIdentifier === 'app:core' ? (
          <img width={30} height={30} alt="Core" src="/stellariscloud.png" />
        ) : (
          <span className="uppercase">
            {emitterIdentifier.split(':')[1]?.[0] ?? ''}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col">
        <div className="font-medium">{children || title}</div>
        {showSubtitle && (
          <span className="truncate text-xs text-muted-foreground">
            {subtitle || emitterIdentifier}
          </span>
        )}
      </div>
    </div>
  )
}
