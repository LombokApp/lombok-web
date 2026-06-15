import type { VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import type { Tone } from '../../utils/tone'
import type { badgeVariants } from './badge.util'

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** Color axis — named additive tone. */
  tone?: Tone
  /** Color axis — one-shot base color. Overrides `tone`. */
  color?: string
  /** Solid foreground override (defaults to `contrast-color`). */
  fg?: string
}
