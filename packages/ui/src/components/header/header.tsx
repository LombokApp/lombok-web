import { useAuthContext } from '@lombokapp/auth-utils'
import { Button, cn } from '@lombokapp/ui-toolkit'
import { ArrowRight, FolderOpen } from 'lucide-react'
import type { MouseEvent } from 'react'
import React from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'

import { useBreakPoints } from '../../utils/hooks'
import { ModeToggle } from '../mode-toggle/mode-toggle'

export const Header = () => {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)
  const { authState } = useAuthContext()
  const navigate = useNavigate()
  const location = useLocation()

  const { md } = useBreakPoints()
  React.useEffect(() => {
    if (isDrawerOpen && !md) {
      setIsDrawerOpen(false)
    }
  }, [isDrawerOpen, md])

  const handleLoginSignupClick = (
    e:
      | MouseEvent<HTMLButtonElement>
      | MouseEvent<HTMLAnchorElement>
      | MouseEvent<HTMLLabelElement>,
    shouldGotoSignup = false,
  ) => {
    e.preventDefault()
    void navigate(shouldGotoSignup ? '/signup' : '/login')
  }

  return (
    <div className="z-20 flex min-h-[3.2rem] flex-1 items-center justify-between gap-8 p-2 px-3">
      <div className="flex shrink-0 items-center p-1">
        <NavLink to={'/'}>
          <div className="flex items-center gap-4">
            <img
              className="rounded-full"
              src="/logo.png"
              width={24}
              height={24}
              alt="Lombok Logo"
            />
            <div
              className={cn(
                'font-bold',
                location.pathname === '/' && 'text-white',
              )}
            >
              Lombok
            </div>
          </div>
        </NavLink>
      </div>
      <div className="flex content-end items-center gap-3 self-end">
        <ModeToggle />
        {authState.isAuthenticated && (
          <Link to="/folders">
            <Button size="sm" className={cn('text-left')}>
              <FolderOpen />
              Folders
            </Button>
          </Link>
        )}
        {!authState.isAuthenticated && (
          <div className="flex items-center gap-6">
            <div className="flex gap-2">
              {!['/signup', '/'].includes(location.pathname) && (
                <Button
                  size="sm"
                  className={cn('text-left')}
                  onClick={(e) => handleLoginSignupClick(e, true)}
                >
                  <div className="flex items-center gap-2">
                    <div className="shrink-0">Signup</div>
                    <ArrowRight className="text-background" />
                  </div>
                </Button>
              )}
              {location.pathname !== '/login' && (
                <Button size="sm" onClick={handleLoginSignupClick}>
                  <div className="flex items-center gap-2">
                    <div className="shrink-0">Login</div>
                    <ArrowRight className="text-background" />
                  </div>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
