import type { VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import type { inputVariants } from './input.util'

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {}
