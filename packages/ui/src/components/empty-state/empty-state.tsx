import { Button } from '@lombokapp/ui-toolkit'
import type { LucideProps } from 'lucide-react'

export function EmptyState({
  onButtonPress,
  text,
  buttonText,
  icon,
}: {
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>
  >

  onButtonPress?: () => void
  text: string
  buttonText?: string
}) {
  const IconComponent = icon
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
