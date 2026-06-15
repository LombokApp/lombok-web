import type { UserDTO } from '@lombokapp/types'
import { Button } from '@lombokapp/ui-toolkit/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@lombokapp/ui-toolkit/components/dropdown-menu'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from '@lombokapp/ui-toolkit/components/tooltip'
import { LayoutGrid, LogOut, UserIcon } from 'lucide-react'
import { Link } from 'react-router'

import { EntityAvatar } from '@/src/components/entity-avatar/entity-avatar'

export function UserNav({
  onSignout,
  viewer,
}: {
  onSignout: () => Promise<void>
  viewer: UserDTO
}) {
  return (
    <DropdownMenu>
      <TooltipProvider disableHoverableContent>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="relative size-8 rounded-full p-0"
              >
                <EntityAvatar
                  kind="user"
                  name={viewer.name ?? viewer.username}
                  image={viewer.avatar}
                  size="sm"
                  className="size-8"
                />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {viewer.username}
            </p>
            {viewer.email && (
              <p className="text-xs leading-none text-foreground">
                {viewer.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="hover:cursor-pointer" asChild>
            <Link to="/folders" className="flex items-center">
              <LayoutGrid className="mr-3 size-4 text-muted-foreground" />
              Folders
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="hover:cursor-pointer" asChild>
            <Link to="/account/settings" className="flex items-center">
              <UserIcon className="mr-3 size-4 text-muted-foreground" />
              Account
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="hover:cursor-pointer"
          onClick={() => void onSignout()}
        >
          <LogOut className="mr-3 size-4 text-muted-foreground" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
