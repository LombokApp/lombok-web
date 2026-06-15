import { cn } from '../../utils'
import { toneStyle } from '../../utils/tone'
import type { BadgeProps } from './badge.types'
import { badgeVariants } from './badge.util'

function Badge({
  className,
  variant,
  tone,
  size,
  color,
  fg,
  style,
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, tone, size }), className)}
      style={toneStyle('badge', color, fg, style)}
      {...props}
    />
  )
}

export { Badge }
