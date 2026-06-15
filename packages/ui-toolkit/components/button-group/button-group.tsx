import * as React from 'react'

import { cn } from '../../utils'

/*
 * ButtonGroup — joins adjacent controls into one unit. Pure container: it squares the
 * inner corners and overlaps shared borders via child selectors, so it works with any
 * children (Buttons, dividers, etc.) without mutating their props. Children keep their
 * own rounding on the outer edges.
 */
interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
}

export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, orientation = 'horizontal', ...props }, ref) => {
    const vertical = orientation === 'vertical'
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex w-fit',
          vertical ? 'flex-col' : 'flex-row items-stretch',
          vertical
            ? '[&>*:not(:first-child)]:-mt-px [&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none'
            : '[&>*:not(:first-child)]:-ml-px [&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none',
          className,
        )}
        {...props}
      />
    )
  },
)
ButtonGroup.displayName = 'ButtonGroup'
