import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import type { LucideProps } from 'lucide-react'

export function EmptyState({
  onButtonPress,
  text,
  buttonText,
  icon,
  variant = 'default',
}: {
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>
  >

  onButtonPress?: () => void
  text: string
  buttonText?: string
  variant?: 'default' | 'row' | 'row-sm'
}) {
  const IconComponent = icon

  if (variant === 'row') {
    return (
      <div className="flex h-32 w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/20 bg-muted/5">
        <div className="flex flex-col items-center gap-2 text-center">
          <IconComponent className="size-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">{text}</p>
          {onButtonPress && buttonText && (
            <Button
              onClick={onButtonPress}
              size="sm"
              variant="outline"
              className="mt-2"
            >
              {buttonText}
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'row-sm') {
    return (
      <div className="flex h-16 w-full items-center justify-center rounded border border-dashed border-muted-foreground/15 bg-muted/5">
        <div className="flex items-center gap-2 text-center">
          <IconComponent className="size-4 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">{text}</p>
          {onButtonPress && buttonText && (
            <Button
              onClick={onButtonPress}
              size="sm"
              variant="ghost"
              className="ml-2 h-6 px-2 text-xs"
            >
              {buttonText}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex size-full flex-col items-center rounded-lg border-2 border-dashed border-white/30 p-6 py-10 text-center">
      <IconComponent className="size-16 text-foreground opacity-60" />
      <h3 className="mt-2 text-sm font-semibold">{text}</h3>
      {onButtonPress && buttonText && (
        <div className="mt-6 flex justify-center">
          <Button onClick={onButtonPress}>{buttonText}</Button>
        </div>
      )}
    </div>
  )
}
