import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/utils'

export const BadgeVariant = {
  default: 'default',
  secondary: 'secondary',
  destructive: 'destructive',
  outline: 'outline',
}

const badgeVariants = cva(
  'focus:ring-ring inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        [BadgeVariant.default]:
          'bg-primary text-primary-foreground hover:bg-primary/80 border-transparent',
        [BadgeVariant.secondary]:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-transparent',
        [BadgeVariant.destructive]:
          'bg-destructive text-destructive-foreground hover:bg-destructive/80 border-transparent',
        [BadgeVariant.outline]: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: BadgeVariant.default,
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
