import * as React from 'react'

import { cn } from '../../utils'
import type { TextareaProps } from './textarea.types'
import { textareaVariants } from './textarea.util'

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, size, ...props }, ref) => {
    return (
      <textarea
        className={cn(textareaVariants({ size }), className)}
        ref={ref}
        {...props}
      />
    )
  },
)
Textarea.displayName = 'Textarea'

export { Textarea }
