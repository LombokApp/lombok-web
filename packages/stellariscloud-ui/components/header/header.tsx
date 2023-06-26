import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { useAuthContext } from '@stellariscloud/auth-utils'
import { Button, Icon } from '@stellariscloud/design-system'
import clsx from 'clsx'
import { useRouter } from 'next/dist/client/router'
import Image from 'next/image'
import type { MouseEvent } from 'react'
import React from 'react'

import { useBreakPoints } from '../../utils/hooks'

export const Header = () => {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)
  const { authState, login, logout } = useAuthContext()

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

  const handleGoogleSignInClick = (
    e: MouseEvent<HTMLButtonElement> &
      MouseEvent<HTMLAnchorElement> &
      MouseEvent<HTMLLabelElement>,
  ) => {
    e.preventDefault()
    void login({
      login: '____', // TODO: replace with a real login mechanism. For now the backend decides who you are.
      password: '',
    }).then(() => router.push('/folders'))
  }

  const handleDisconnectClick = (
    e: MouseEvent<HTMLButtonElement> &
      MouseEvent<HTMLAnchorElement> &
      MouseEvent<HTMLLabelElement>,
  ) => {
    e.preventDefault()
    void logout()
  }
  return (
    <div
      className={clsx(
        'absolute z-50 top-0 right-0 p-2',
        router.pathname !== '/' && 'mx-auto',
      )}
    >
      {!authState.isAuthenticated && (
        <Button
          className={clsx('text-left', 'border', 'border-gray-50/[.3]')}
          variant="ghost"
          onClick={handleGoogleSignInClick}
        >
          <div className="flex items-center gap-2">
            <Image
              width={'25'}
              height={'25'}
              alt="Sign in with Google"
              src={'/google.svg'}
            />
            <div className="pr-6 shrink-0">Sign&nbsp;in</div>
          </div>
        </Button>
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
  )
}
