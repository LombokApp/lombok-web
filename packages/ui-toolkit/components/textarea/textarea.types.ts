import type { VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import type { textareaVariants } from './textarea.util'

export interface TextareaProps
  extends
    Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof textareaVariants> {}
