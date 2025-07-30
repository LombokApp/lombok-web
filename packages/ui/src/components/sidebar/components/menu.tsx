import type { UserDTO } from '@stellariscloud/types'
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
import { Link, useLocation } from 'react-router-dom'

import type { AppMenuItemAndHref } from '@/src/contexts/server.context'

import { getMenuList } from '../menu-list'
import { CollapseMenuButton } from './collapse-menu-button'

interface MenuProps {
  isOpen: boolean | undefined
  viewer: UserDTO
  appMenuItems: AppMenuItemAndHref[]
}

const protocol = window.location.protocol
const hostname = window.location.hostname
const port = window.location.port
const API_HOST = `${hostname}${port ? `:${port}` : ''}`

export function Menu({
  onSignOut,
  isOpen,
  viewer,
  appMenuItems,
}: { onSignOut: () => Promise<void> } & MenuProps) {
  const location = useLocation()

  const menuList = getMenuList(location.pathname, viewer, appMenuItems)
  return (
    <div className="flex h-full flex-col  pb-3">
      <ScrollArea className="h-full flex-1 overflow-x-visible [&>div>div[style]]:!block">
        <nav className="size-full pt-2">
          <ul className="flex h-full flex-col items-start space-y-1 px-0">
            {menuList.map(({ groupLabel, menus }, index) => (
              <li
                className={cn('w-full', groupLabel ? 'pt-5' : '')}
                key={index}
              >
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
                  (
                    { href, label, icon: Icon, active, submenus, context },
                    _index,
                  ) =>
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
                                <Link
                                  to={href}
                                  className={
                                    typeof Icon === 'string' ? 'pl-2' : ''
                                  }
                                >
                                  <span
                                    className={cn(
                                      typeof Icon === 'string'
                                        ? 'pl-0 rounded-sm overflow-hidden'
                                        : '',
                                      isOpen === false ? '' : 'mr-4',
                                    )}
                                  >
                                    {typeof Icon === 'string' ? (
                                      <img
                                        src={`${protocol}//${context?.uiName}.${context?.appIdentifier}.apps.${API_HOST}${Icon}`}
                                        // src={`/apps${Icon}`}
                                        className={cn(
                                          typeof Icon === 'string'
                                            ? 'size-6 rounded-md overflow-hidden'
                                            : '',
                                        )}
                                      />
                                    ) : (
                                      <Icon className="size-4" />
                                    )}
                                  </span>
                                  <p
                                    className={cn(
                                      'max-w-[200px] truncate',
                                      isOpen === false
                                        ? '-translate-x-96 opacity-0'
                                        : 'translate-x-0 opacity-100',
                                    )}
                                  >
                                    {context?.appLabel && (
                                      <>
                                        <span className="font-bold">
                                          {context.appLabel}
                                        </span>
                                        {' / '}
                                      </>
                                    )}
                                    <span>{label}</span>
                                  </p>
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
    </div>
  )
}
