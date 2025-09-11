import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import React from 'react'

import { cn } from '../../utils'

export const ButtonVariant = {
  default: 'default',
  destructive: 'destructive',
  outline: 'outline',
  secondary: 'secondary',
  ghost: 'ghost',
  link: 'link',
}

export const ButtonSize = {
  default: 'default',
  xs: 'xs',
  sm: 'sm',
  lg: 'lg',
  icon: 'icon',
}

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        [ButtonVariant.default]:
          'bg-primary text-primary-foreground hover:bg-primary/90',
        [ButtonVariant.destructive]:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        [ButtonVariant.outline]:
          'border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        [ButtonVariant.secondary]:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        [ButtonVariant.ghost]:
          'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        [ButtonVariant.link]: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        [ButtonSize.default]: 'h-10 px-4 py-2',
        [ButtonSize.xs]: 'h-7 rounded-md px-2.5',
        [ButtonSize.sm]: 'h-9 rounded-md px-3',
        [ButtonSize.lg]: 'h-11 rounded-md px-8',
        [ButtonSize.icon]: 'size-10',
      },
    },
    defaultVariants: {
      variant: ButtonVariant.default,
      size: ButtonSize.default,
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
