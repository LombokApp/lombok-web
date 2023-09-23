import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { useAuthContext } from '@stellariscloud/auth-utils'
import { Button, Icon } from '@stellariscloud/design-system'
import clsx from 'clsx'
import { useRouter } from 'next/dist/client/router'
import type { MouseEvent } from 'react'
import React from 'react'

import { useBreakPoints } from '../../utils/hooks'
import { ThemeSwitch } from '../theme-switch/theme-switch'

export const Header = () => {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)
  const { authState, logout } = useAuthContext()

  const { md } = useBreakPoints()
  React.useEffect(() => {
    if (isDrawerOpen && !md) {
      setIsDrawerOpen(false)
    }
  }, [isDrawerOpen, md])

  const router = useRouter()
  React.useEffect(() => {
    if (isDrawerOpen) {
      const closeDrawer = () => setIsDrawerOpen(false)
      router.events.on('routeChangeStart', closeDrawer)
      router.events.on('hashChangeStart', closeDrawer)
      return () => {
        router.events.off('routeChangeStart', closeDrawer)
        router.events.off('hashChangeStart', closeDrawer)
      }
    }
  }, [isDrawerOpen, router])

  const handleLoginSignupClick = (
    e:
      | MouseEvent<HTMLButtonElement>
      | MouseEvent<HTMLAnchorElement>
      | MouseEvent<HTMLLabelElement>,
    shouldGotoSignup: boolean = false,
  ) => {
    e.preventDefault()
    void router.push(shouldGotoSignup ? '/signup' : '/login')
  }

  const handleDisconnectClick = (
    e:
      | MouseEvent<HTMLButtonElement>
      | MouseEvent<HTMLAnchorElement>
      | MouseEvent<HTMLLabelElement>,
  ) => {
    e.preventDefault()
    void logout()
  }
  return (
    <div className={clsx('z-50 p-2', router.pathname !== '/' && 'mx-auto')}>
      <div className="flex gap-8">
        <ThemeSwitch />
        {!authState.isAuthenticated && (
          <div className="flex gap-2">
            <Button
              className={clsx('text-left', 'border', 'border-gray-50/[.3]')}
              variant="ghost"
              onClick={handleLoginSignupClick}
            >
              <div className="flex items-center gap-2">
                <div className="shrink-0">Log in</div>
              </div>
            </Button>
            <Button
              className={clsx('text-left', 'border', 'border-gray-50/[.3]')}
              variant="ghost"
              onClick={(e) => handleLoginSignupClick(e, true)}
            >
              <div className="flex items-center gap-2">
                <div className="shrink-0">Signup</div>
              </div>
            </Button>
          </div>
        )}
        {authState.isAuthenticated && (
          <button
            className="btn btn-md btn-link text-gray-300 hover:text-gray-500"
            onClick={handleDisconnectClick}
          >
            <Icon size="md" icon={ArrowRightOnRectangleIcon}></Icon>
          </button>
        )}
      </div>
    </div>
  )
}
