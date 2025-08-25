import {
  Button,
  cn,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@lombokapp/ui-toolkit'
import { DropdownMenuArrow } from '@radix-ui/react-dropdown-menu'
import type { LucideIcon } from 'lucide-react'
import { ChevronDown, Dot } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface Submenu {
  href: string
  label: string
  active?: boolean
}

interface CollapseMenuButtonProps {
  icon: LucideIcon
  label: string
  active: boolean
  submenus: Submenu[]
  isOpen: boolean | undefined
}

export function CollapseMenuButton({
  icon: Icon,
  label,
  submenus,
  isOpen,
}: CollapseMenuButtonProps) {
  const location = useLocation()
  const isSubmenuActive = submenus.some((submenu) =>
    submenu.active === undefined
      ? submenu.href === location.pathname
      : submenu.active,
  )
  const [isCollapsed, setIsCollapsed] = useState<boolean>(isSubmenuActive)

  return isOpen ? (
    <Collapsible
      open={isCollapsed}
      onOpenChange={setIsCollapsed}
      className="w-full"
    >
      <CollapsibleTrigger
        className="mb-1 [&[data-state=open]>div>div>svg]:rotate-180"
        asChild
      >
        <Button
          variant={isSubmenuActive ? 'secondary' : 'ghost'}
          className="h-10 w-full justify-start"
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center">
              <span className="mr-4">
                <Icon size={18} />
              </span>
              <p
                className={cn(
                  'max-w-[150px] truncate',
                  'translate-x-0 opacity-100',
                )}
              >
                {label}
              </p>
            </div>
            <div
              className={cn('whitespace-nowrap', 'translate-x-0 opacity-100')}
            >
              <ChevronDown
                size={18}
                className="transition-transform duration-200"
              />
            </div>
          </div>
        </Button>
      </CollapsibleTrigger>
      {/* eslint-disable-next-line tailwindcss/no-custom-classname */}
      <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
        {submenus.map(({ href, label: _label, active }, index) => (
          <Button
            key={index}
            variant={
              (active === undefined && location.pathname === href) || active
                ? 'secondary'
                : 'ghost'
            }
            className="mb-1 h-10 w-full justify-start"
            asChild
          >
            <Link to={href}>
              <span className="ml-2 mr-4">
                <Dot size={18} />
              </span>
              <p
                className={cn(
                  'max-w-[170px] truncate',
                  'translate-x-0 opacity-100',
                )}
              >
                {_label}
              </p>
            </Link>
          </Button>
        ))}
      </CollapsibleContent>
    </Collapsible>
  ) : (
    <DropdownMenu>
      <TooltipProvider disableHoverableContent>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant={isSubmenuActive ? 'secondary' : 'ghost'}
                className="mb-1 h-10 w-full justify-start"
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center">
                    <span className={cn(isOpen === false ? '' : 'mr-4')}>
                      <Icon size={18} />
                    </span>
                    <p
                      className={cn(
                        'max-w-[200px] truncate',
                        isOpen === false ? 'opacity-0' : 'opacity-100',
                      )}
                    >
                      {label}
                    </p>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" align="start" alignOffset={2}>
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent side="right" sideOffset={25} align="start">
        <DropdownMenuLabel className="max-w-[190px] truncate">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {submenus.map(({ href, label: _label, active }, index) => (
          <DropdownMenuItem key={index} asChild>
            <a
              className={`cursor-pointer ${
                ((active === undefined && location.pathname === href) ||
                  active) &&
                'bg-secondary'
              }`}
              href={href}
            >
              <p className="max-w-[180px] truncate">{_label}</p>
            </a>
          </DropdownMenuItem>
        ))}
        <DropdownMenuArrow />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
