import type { VariantProps } from 'class-variance-authority'

import type { Tone } from '../../utils/tone'
import type { buttonVariants } from './button.util'

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** Color axis — named additive tone. */
  tone?: Tone
  /** Color axis — one-shot base color; derives all states. Overrides `tone`. */
  color?: string
  /** Solid foreground override (defaults to `contrast-color`). */
  fg?: string
  /** Shows a spinner and disables the button. */
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}
