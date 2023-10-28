import React from 'react'

import { Button } from '../button/button'
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
    <div className="text-center flex flex-col items-center w-full h-full bg-white dark:bg-white/5 p-6 py-10 rounded-lg border-2 border-dashed border-white/30">
      <Icon size="lg" icon={icon} className="text-gray-500" />
      <h3 className="mt-2 text-sm font-semibold text-gray-500 dark:text-white">
        {text}
      </h3>
      {onButtonPress && buttonText && (
        <div className="flex justify-center mt-6">
          <Button primary onClick={onButtonPress}>
            {buttonText}
          </Button>
        </div>
      )}
    </div>
  )
}
