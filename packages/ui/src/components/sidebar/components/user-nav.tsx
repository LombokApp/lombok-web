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
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import { LayoutGrid, LogOut, UserIcon } from 'lucide-react'
import { Link } from 'react-router'

import { EntityAvatar } from '@/src/components/entity-avatar/entity-avatar'

export function UserNav({
  onSignout,
  viewer,
  isOpen,
}: {
  onSignout: () => Promise<void>
  viewer: UserDTO
  isOpen?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'h-10 w-full justify-start gap-2 px-1.5',
            !isOpen && 'justify-center px-0',
          )}
        >
          <EntityAvatar
            kind="user"
            name={viewer.name ?? viewer.username}
            image={viewer.avatar}
            size="sm"
            className="size-7 shrink-0"
          />
          {isOpen && (
            <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
              {viewer.name ?? viewer.username}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="start" side="top" forceMount>
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
