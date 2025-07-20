import { Button } from '@stellariscloud/ui-toolkit'

import type { IconProps } from '../icon'
import { Icon } from '../icon'

export function EmptyState({
  onButtonPress,
  text,
  buttonText,
  icon,
}: {
  icon: IconProps['icon']
  onButtonPress?: () => void
  text: string
  buttonText?: string
}) {
  return (
    <div className="flex size-full flex-col items-center rounded-lg border-2 border-dashed border-white/30 p-6 py-10 text-center">
      <Icon size="lg" icon={icon} className="" />
      <h3 className="mt-2 text-sm font-semibold">{text}</h3>
      {onButtonPress && buttonText && (
        <div className="mt-6 flex justify-center">
          <Button onClick={onButtonPress}>{buttonText}</Button>
        </div>
      )}
    </div>
  )
}
