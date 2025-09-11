import type { IAuthContext } from '@lombokapp/auth-utils'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import { ScrollArea } from '@lombokapp/ui-toolkit/components/scroll-area/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@lombokapp/ui-toolkit/components/tooltip'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import { Ellipsis, LogOut } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import type { AppPathContribution } from '@/src/contexts/server'

import { getMenuList } from '../menu-list'
import { CollapseMenuButton } from './collapse-menu-button'

interface MenuProps {
  isOpen: boolean | undefined
  viewer: NonNullable<IAuthContext['viewer']>
  sidebarMenuLinkContributions: AppPathContribution[]
}

const protocol = window.location.protocol
const hostname = window.location.hostname
const port = window.location.port
const API_HOST = `${hostname}${port ? `:${port}` : ''}`

export function Menu({
  onSignOut,
  isOpen,
  viewer,
  sidebarMenuLinkContributions,
}: { onSignOut: () => Promise<void> } & MenuProps) {
  const location = useLocation()
  const menuList = getMenuList(
    location.pathname,
    viewer,
    sidebarMenuLinkContributions,
  )
  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="h-full flex-1 overflow-x-visible [&>div>div[style]]:!block">
        <nav className="size-full py-2">
          <ul className="flex h-full flex-col items-start space-y-1">
            {menuList.map(({ groupLabel, menus }, index) => (
              <li
                className={cn(
                  'w-full justify-center',
                  groupLabel ? 'pt-6' : '',
                )}
                key={index}
              >
                {(isOpen && groupLabel) || isOpen === undefined ? (
                  <p className="mb-2 px-3 text-xs font-medium text-muted-foreground/50">
                    {groupLabel}
                  </p>
                ) : !isOpen && groupLabel ? (
                  <TooltipProvider>
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger className="w-full">
                        <div className="mb-2 flex w-full items-center justify-center">
                          <Ellipsis className="size-4 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{groupLabel}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <div className="mb-2"></div>
                )}
                {menus.map(
                  (
                    { href, label, icon: Icon, active, submenus, context },
                    _index,
                  ) =>
                    !submenus || submenus.length === 0 ? (
                      <div className="w-full px-3" key={_index}>
                        <TooltipProvider disableHoverableContent>
                          <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                className={cn(
                                  'h-9 w-full px-2 font-normal',
                                  isOpen ? 'justify-start' : 'justify-center',
                                  active
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-foreground/70 hover:bg-accent/50 hover:text-accent-foreground',
                                )}
                                asChild
                              >
                                <Link
                                  to={href}
                                  className={cn(
                                    'flex w-full transition-all duration-300 ease-in-out',
                                    isOpen
                                      ? 'justify-start'
                                      : 'justify-center pl-2',
                                  )}
                                >
                                  {!isOpen && <span></span>}
                                  <span className={cn('', !isOpen ? '' : '')}>
                                    {typeof Icon === 'string' ? (
                                      <img
                                        src={`${protocol}//${context?.appIdentifier}.apps.${API_HOST}${Icon}`}
                                        alt={`${context?.appLabel || label} icon`}
                                        className="size-4"
                                      />
                                    ) : (
                                      <Icon className="size-4" />
                                    )}
                                  </span>
                                  <span
                                    className={cn(
                                      'text-sm truncate duration-300 ease-in-out',
                                      !isOpen
                                        ? '-translate-x-0 opacity-0 w-0'
                                        : 'translate-x-0 opacity-100 pl-3',
                                    )}
                                  >
                                    {context?.appLabel
                                      ? `${context.appLabel} / ${label}`
                                      : label}
                                  </span>
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            {isOpen === false && (
                              <TooltipContent side="right">
                                {label}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ) : (
                      <div className="w-full" key={_index}>
                        {typeof Icon !== 'string' && (
                          <CollapseMenuButton
                            icon={Icon}
                            label={label}
                            active={
                              active === undefined
                                ? location.pathname.startsWith(href)
                                : active
                            }
                            submenus={submenus}
                            isOpen={isOpen}
                          />
                        )}
                      </div>
                    ),
                )}
              </li>
            ))}
          </ul>
        </nav>
      </ScrollArea>
      <div className="px-3 pb-2">
        <TooltipProvider disableHoverableContent>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Button
                onClick={() => void onSignOut()}
                variant="ghost"
                className={cn(
                  !isOpen ? 'justify-center' : 'justify-start',
                  'h-9 w-full px-2 font-normal text-foreground/70 hover:bg-accent/50 hover:text-accent-foreground',
                )}
              >
                <span className={cn(isOpen && 'mr-3')}>
                  <LogOut className="size-4" />
                </span>
                <span
                  className={cn(
                    'text-sm',
                    !isOpen
                      ? '-translate-x-96 opacity-0 w-0'
                      : 'translate-x-0 opacity-100',
                  )}
                >
                  Sign out
                </span>
              </Button>
            </TooltipTrigger>
            {!isOpen && <TooltipContent side="right">Sign out</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
