import * as React from 'react'

import { cn } from '@/utils'
import * as TogglePrimitive from '@radix-ui/react-toggle'
import { cva, type VariantProps } from 'class-variance-authority'

export const ToggleVariant = {
  default: 'default',
  outline: 'outline',
}

export const ToggleSize = {
  default: 'default',
  sm: 'sm',
  lg: 'lg',
}

const toggleVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground',
  {
    variants: {
      variant: {
        [ToggleVariant.default]: 'bg-transparent',
        [ToggleVariant.outline]:
          'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        [ToggleSize.default]: 'h-10 px-3',
        [ToggleSize.sm]: 'h-9 px-2.5',
        [ToggleSize.lg]: 'h-11 px-5',
      },
    },
    defaultVariants: {
      variant: ToggleVariant.default,
      size: ToggleSize.default,
    },
  },
)

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
))

Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle, toggleVariants }
