'use client'

import {
  Button,
  cn,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@stellariscloud/ui-toolkit'
import { Ellipsis, LogOut } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import { getMenuList } from '../menu-list'
import { CollapseMenuButton } from './collapse-menu-button'

interface MenuProps {
  isOpen: boolean | undefined
}

export function Menu({
  onSignOut,
  isOpen,
}: { onSignOut: () => Promise<void> } & MenuProps) {
  const location = useLocation()
  const menuList = getMenuList(location.pathname)

  return (
    <ScrollArea className="h-full [&>div>div[style]]:!block">
      <nav className="size-full pt-2">
        <ul className="flex h-full flex-col items-start space-y-1 px-0">
          {menuList.map(({ groupLabel, menus }, index) => (
            <li className={cn('w-full', groupLabel ? 'pt-5' : '')} key={index}>
              {(isOpen && groupLabel) || isOpen === undefined ? (
                <p className="max-w-[248px] truncate px-4 pb-2 text-sm font-medium text-muted-foreground">
                  {groupLabel}
                </p>
              ) : !isOpen && groupLabel ? (
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger className="w-full">
                      <div className="flex w-full items-center justify-center">
                        <Ellipsis className="size-5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{groupLabel}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <p className="pb-2"></p>
              )}
              {menus.map(
                ({ href, label, icon: Icon, active, submenus }, _index) =>
                  !submenus || submenus.length === 0 ? (
                    <div className="w-full" key={_index}>
                      <TooltipProvider disableHoverableContent>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <Button
                              variant={
                                (active === undefined &&
                                  location.pathname.startsWith(href)) ||
                                active
                                  ? 'outline'
                                  : 'ghost'
                              }
                              className={cn(
                                'mb-1 h-10 w-full justify-start',
                                (active === undefined &&
                                  location.pathname.startsWith(href)) ||
                                  active
                                  ? 'bg-foreground/5'
                                  : undefined,
                              )}
                              asChild
                            >
                              <a href={href}>
                                <span
                                  className={cn(isOpen === false ? '' : 'mr-4')}
                                >
                                  <Icon size={18} />
                                </span>
                                <p
                                  className={cn(
                                    'max-w-[200px] truncate',
                                    isOpen === false
                                      ? '-translate-x-96 opacity-0'
                                      : 'translate-x-0 opacity-100',
                                  )}
                                >
                                  {label}
                                </p>
                              </a>
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
                    </div>
                  ),
              )}
            </li>
          ))}
          <li className="flex w-full grow items-end self-end pb-3">
            <TooltipProvider disableHoverableContent>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => void onSignOut()}
                    variant="outline"
                    className="mt-5 h-10 w-full justify-center"
                  >
                    <span className={cn(isOpen === false ? '' : 'mr-4')}>
                      <LogOut size={18} />
                    </span>
                    <p
                      className={cn(
                        'whitespace-nowrap',
                        isOpen === false ? 'hidden opacity-0' : 'opacity-100',
                      )}
                    >
                      Sign out
                    </p>
                  </Button>
                </TooltipTrigger>
                {isOpen === false && (
                  <TooltipContent side="right">Sign out</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </li>
        </ul>
      </nav>
    </ScrollArea>
  )
}
