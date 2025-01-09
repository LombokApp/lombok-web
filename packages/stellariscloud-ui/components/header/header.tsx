import { ArrowRightIcon, FolderOpenIcon } from '@heroicons/react/24/outline'
import { useAuthContext } from '@stellariscloud/auth-utils'
import { cn } from '@stellariscloud/ui-toolkit'
import { useRouter } from 'next/dist/client/router'
import Image from 'next/image'
import Link from 'next/link'
import type { MouseEvent } from 'react'
import React from 'react'

import { Icon } from '../../design-system/icon'
import { useBreakPoints } from '../../utils/hooks'
import { ModeToggle } from '../mode-toggle/mode-toggle'
import { Button } from '@stellariscloud/ui-toolkit'

export const Header = () => {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)
  const { authState } = useAuthContext()

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

  return (
    <div className="flex flex-1 items-center justify-between gap-8 z-20 p-2 px-3 min-h-[3.2rem]">
      <div className="flex shrink-0 items-center px-1 py-1">
        <Link href={'/'} passHref>
          <div className="flex items-center gap-4">
            <Image
              className="rounded-full"
              priority
              src="/stellariscloud.png"
              width={24}
              height={24}
              alt="Stellaris cloud logo"
            />
            <div
              className={cn(
                'font-bold',
                router.pathname === '/' && 'text-white',
              )}
            >
              Stellaris Cloud
            </div>
          </div>
        </Link>
      </div>
      <div className="flex items-center self-end align-end content-end gap-3">
        <ModeToggle />
        {authState.isAuthenticated && (
          <Link href="/folders">
            <Button size="sm" className={cn('text-left')}>
              <FolderOpenIcon />
              Folders
            </Button>
          </Link>
        )}
        {!authState.isAuthenticated && (
          <div className="flex items-center gap-6">
            <div className="flex gap-2">
              {!['/signup', '/'].includes(router.pathname) && (
                <Button
                  size="sm"
                  className={cn('text-left')}
                  onClick={(e) => handleLoginSignupClick(e, true)}
                >
                  <div className="flex items-center gap-2">
                    <div className="shrink-0">Signup</div>
                    <Icon
                      icon={ArrowRightIcon}
                      className="dark:text-white"
                      size="sm"
                    />
                  </div>
                </Button>
              )}
              {router.pathname !== '/login' && (
                <Button size="sm" onClick={handleLoginSignupClick}>
                  <div className="flex items-center gap-2">
                    <div className="shrink-0">Login</div>
                    <Icon
                      icon={ArrowRightIcon}
                      className="dark:text-white"
                      size="sm"
                    />
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
