import { ChevronDown } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../utils'
import type { Tone } from '../../utils/tone'
import { Button } from '../button/button'
import { ButtonGroup } from '../button-group/button-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../dropdown-menu/dropdown-menu'

export interface SplitButtonProps {
  /** Primary action label. */
  label: string
  /** Leading icon on the primary button. */
  icon?: React.ReactNode
  /** Color axis — named tone, forwarded to both buttons. */
  tone?: Tone
  /** One-shot base color; derives all states. Overrides `tone`. */
  color?: string
  /** Solid foreground override. */
  fg?: string
  /** Apply the solid gradient treatment. */
  gradient?: boolean
  /**
   * Primary action. When `null`, the primary button opens the menu instead of
   * running an action (e.g. nothing sensible to launch by default).
   */
  onPrimaryAction?: (() => void) | null
  /** Disables the whole control. */
  disabled?: boolean
  /** Tooltip for the primary button. */
  title?: string
  /** Menu content — typically rich `DropdownMenuItem`s. */
  children: React.ReactNode
  /** Menu alignment relative to the chevron trigger. Defaults to `end`. */
  align?: 'start' | 'center' | 'end'
  className?: string
  contentClassName?: string
}

/**
 * A split button: a primary action joined to a chevron that opens a dropdown
 * menu of alternative actions. Built on the Radix `DropdownMenu` (keyboard nav,
 * focus management, portal/collision) and the toolkit `Button` color system.
 */
export function SplitButton({
  label,
  icon,
  tone,
  color,
  fg,
  gradient,
  onPrimaryAction,
  disabled,
  title,
  children,
  align = 'end',
  className,
  contentClassName,
}: SplitButtonProps) {
  const [open, setOpen] = React.useState(false)
  const colorProps = { tone, color, fg, gradient }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <ButtonGroup className={cn('shrink-0', className)}>
        <Button
          type="button"
          {...colorProps}
          disabled={disabled}
          title={title}
          leftIcon={icon}
          onClick={() => {
            if (onPrimaryAction) {
              onPrimaryAction()
            } else {
              setOpen((prev) => !prev)
            }
          }}
          className="text-compact h-auto px-3 py-[5px] font-medium"
        >
          {label}
        </Button>
        <div className="-mr-px w-px translate-x-[50%] bg-white/50 opacity-20" />
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            {...colorProps}
            disabled={disabled}
            aria-label="More options"
            title="More options"
            className="h-auto px-2.5"
          >
            <ChevronDown
              className={cn(
                'size-3.5 transition-transform duration-150',
                open && 'rotate-180',
              )}
            />
          </Button>
        </DropdownMenuTrigger>
      </ButtonGroup>
      <DropdownMenuContent
        align={align}
        className={cn('w-[260px]', contentClassName)}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
