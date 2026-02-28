import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@lombokapp/ui-toolkit/components/tooltip'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import type { LucideIcon } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router'

interface SidebarItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon | string
  iconAlt?: string
  label: string
  isOpen: boolean | undefined
  active?: boolean
  badge?: boolean
  href?: string
  asChild?: boolean
}

export const SidebarItem = React.forwardRef<
  HTMLButtonElement,
  SidebarItemProps
>(
  (
    {
      icon: Icon,
      iconAlt,
      label,
      isOpen,
      active,
      badge,
      href,
      asChild,
      className,
      ...buttonProps
    },
    ref,
  ) => {
    const isSidebarCollapsed = isOpen === false

    const iconElement = (
      <span className="relative shrink-0">
        {typeof Icon === 'string' ? (
          <img src={Icon} alt={iconAlt ?? label} className="size-4" />
        ) : (
          <Icon className="size-4" />
        )}
        {badge && (
          <span
            className="absolute -right-1 -top-1 size-2 rounded-full bg-destructive"
            aria-hidden="true"
          />
        )}
      </span>
    )

    const labelElement = (
      <span
        className={cn(
          'grid overflow-hidden transition-[grid-template-columns,padding] ease-in-out',
          !isOpen
            ? 'grid-cols-[0fr] pl-0 duration-200'
            : 'grid-cols-[1fr] pl-3 duration-200',
        )}
      >
        <span
          className={cn(
            'min-w-0 overflow-hidden truncate text-sm transition-opacity ease-in-out',
            !isOpen ? 'opacity-0 duration-150' : 'opacity-100 duration-500',
          )}
        >
          {label}
        </span>
      </span>
    )

    const content = (
      <span className="flex w-full items-center">
        {iconElement}
        {labelElement}
      </span>
    )

    const buttonClassName = cn(
      'h-9 w-full justify-start font-normal text-left transition-[padding] duration-300 ease-in-out',
      !isOpen ? 'pl-[14px] pr-2' : 'px-2',
      active
        ? 'bg-accent text-accent-foreground'
        : 'text-foreground/70 hover:bg-accent/50 hover:text-accent-foreground',
      className,
    )

    const buttonElement = href ? (
      <Button
        ref={ref}
        variant="ghost"
        className={buttonClassName}
        asChild
        {...buttonProps}
      >
        <Link to={href} className="flex w-full items-center">
          {iconElement}
          {labelElement}
        </Link>
      </Button>
    ) : (
      <Button
        ref={ref}
        variant="ghost"
        className={buttonClassName}
        {...buttonProps}
      >
        {content}
      </Button>
    )

    if (asChild) {
      // When used as a trigger (e.g., for a Popover), render the button
      // without tooltip wrapping — the parent handles composition
      return buttonElement
    }

    return (
      <TooltipProvider disableHoverableContent>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>{buttonElement}</TooltipTrigger>
          {isSidebarCollapsed && (
            <TooltipContent side="right">{label}</TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    )
  },
)
SidebarItem.displayName = 'SidebarItem'
