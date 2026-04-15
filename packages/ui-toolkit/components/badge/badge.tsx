import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '../../utils'

export const BadgeVariant = {
  default: 'default',
  secondary: 'secondary',
  destructive: 'destructive',
  outline: 'outline',
}

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        [BadgeVariant.default]:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/90',
        [BadgeVariant.secondary]:
          'border-transparent bg-muted text-foreground hover:bg-muted/80',
        [BadgeVariant.destructive]:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90',
        [BadgeVariant.outline]:
          'border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
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
