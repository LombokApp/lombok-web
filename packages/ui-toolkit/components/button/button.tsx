import { Slot } from '@radix-ui/react-slot'
import { Loader2 } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../utils'
import { toneStyle } from '../../utils/tone'
import type { ButtonProps } from './button.types'
import { buttonVariants } from './button.util'

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      tone,
      size,
      gradient,
      dim,
      color,
      fg,
      loading = false,
      leftIcon,
      rightIcon,
      asChild = false,
      disabled,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button'

    // Slot requires a single child — skip icon/spinner decoration when asChild.
    const content = asChild ? (
      children
    ) : (
      <>
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : leftIcon ? (
          <div className="flex items-center justify-center [&>svg]:size-4">
            {leftIcon}
          </div>
        ) : null}
        {children}
        {rightIcon ? (
          <div className="flex items-center justify-center [&>svg]:size-4">
            {rightIcon}
          </div>
        ) : null}
      </>
    )

    return (
      <Comp
        ref={ref}
        className={cn(
          buttonVariants({ variant, tone, size, gradient, dim }),
          className,
        )}
        style={toneStyle('button', color, fg, style)}
        disabled={disabled || loading}
        {...props}
      >
        {content}
      </Comp>
    )
  },
)
Button.displayName = 'Button'
