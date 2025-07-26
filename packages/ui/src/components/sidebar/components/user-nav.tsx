import type { UserDTO } from '@stellariscloud/types'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from '@stellariscloud/ui-toolkit'
import { LayoutGrid, LogOut, User } from 'lucide-react'
import { Link } from 'react-router-dom'

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
                className="relative size-8 rounded-full"
              >
                <Avatar className="size-8">
                  <AvatarImage src="#" alt="Avatar" />
                  <AvatarFallback className="bg-transparent">
                    {(viewer.name?.length ?? 0) > 0
                      ? viewer.name?.[0]
                      : viewer.username.length > 0
                        ? viewer.username[0]
                        : '?'}
                  </AvatarFallback>
                </Avatar>
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
            <Link to="/access-keys" className="flex items-center">
              <User className="mr-3 size-4 text-muted-foreground" />
              Access Keys
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
