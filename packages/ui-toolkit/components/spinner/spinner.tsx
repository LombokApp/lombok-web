import { Loader2, type LucideProps } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../utils'

/**
 * Spinner — the design-system loading indicator (same glyph as Button's `loading`).
 * Inherits `currentColor`; set color/size via `className` or the `size` prop.
 */
const Spinner = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ className, size = 16, ...props }, ref) => (
    <Loader2
      ref={ref}
      size={size}
      role="status"
      aria-label="Loading"
      className={cn('animate-spin', className)}
      {...props}
    />
  ),
)
Spinner.displayName = 'Spinner'

export { Spinner }
