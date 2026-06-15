import * as SwitchPrimitives from '@radix-ui/react-switch'
import type { LucideIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../utils'

type SwitchProps = React.ComponentPropsWithoutRef<
  typeof SwitchPrimitives.Root
> & {
  thumbClassName?: string
  checkedIcon?: LucideIcon
  uncheckedIcon?: LucideIcon
  iconClassName?: string
}

// Colors route through CSS variables so consumers can override via className,
// e.g. `[--switch-bg-checked:var(--color-tone-blue)] [--switch-border:var(--border)]`.
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(
  (
    {
      className,
      thumbClassName,
      checkedIcon: CheckedIcon,
      uncheckedIcon: UncheckedIcon,
      iconClassName,
      ...props
    },
    ref,
  ) => (
    <SwitchPrimitives.Root
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        'border-[var(--switch-border,transparent)]',
        'data-[state=checked]:bg-[var(--switch-bg-checked,var(--primary))] data-[state=unchecked]:bg-[var(--switch-bg-unchecked,var(--input))]',
        className,
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          'group pointer-events-none flex size-5 items-center justify-center rounded-full shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
          'bg-[var(--switch-thumb,var(--background))] text-[var(--switch-icon,var(--foreground))]',
          thumbClassName,
        )}
      >
        {CheckedIcon ? (
          <CheckedIcon
            className={cn(
              'size-3 group-data-[state=unchecked]:hidden',
              iconClassName,
            )}
            aria-hidden
          />
        ) : null}
        {UncheckedIcon ? (
          <UncheckedIcon
            className={cn(
              'size-3 group-data-[state=checked]:hidden',
              iconClassName,
            )}
            aria-hidden
          />
        ) : null}
      </SwitchPrimitives.Thumb>
    </SwitchPrimitives.Root>
  ),
)
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
