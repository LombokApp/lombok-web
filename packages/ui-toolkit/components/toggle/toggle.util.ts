import { cva } from 'class-variance-authority'

import { ToggleSize, ToggleVariant } from './toggle.constants'

export const toggleVariants = cva(
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
