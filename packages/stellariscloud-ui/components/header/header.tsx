import { ArrowRightIcon, FolderOpenIcon } from '@heroicons/react/24/outline'
import { useAuthContext } from '@stellariscloud/auth-utils'
import clsx from 'clsx'
import { useRouter } from 'next/dist/client/router'
import Image from 'next/image'
import Link from 'next/link'
import type { MouseEvent } from 'react'
import React from 'react'

import { Button } from '../../design-system/button/button'
import { Icon } from '../../design-system/icon'
import { useBreakPoints } from '../../utils/hooks'
import { ThemeSwitch } from '../theme-switch/theme-switch'

const HEADER_PAGES = [
  {
    title: 'Home',
    href: '/',
  },
  {
    title: 'How it works',
    href: '/how-it-works',
  },
  {
    title: 'Sponsor',
    href: '/sponsor',
  },
  {
    title: 'Contact',
    href: '/contact',
  },
  {
    title: 'Docs',
    href: 'https://docs.stellariscloud.com',
  },
]

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
              className={clsx(
                'font-bold text-gray-800 dark:text-white',
                router.pathname === '/' && 'text-white',
              )}
            >
              Stellaris Cloud
            </div>
          </div>
        </Link>
      </div>
      <div className="flex w-full justify-center gap-4 absolute -z-10">
        <div className="flex gap-4">
          {HEADER_PAGES.map((page, i) => (
            <Link key={i} href={page.href}>
              <Button
                link
                className={clsx(
                  'z-10 capitalise',
                  router.pathname === '/' && 'text-white',
                )}
                size="md"
              >
                {page.title}
              </Button>
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center self-end align-end content-end gap-3">
        <ThemeSwitch isVertical={false} />
        {authState.isAuthenticated && (
          <Link href="/folders">
            <Button
              icon={FolderOpenIcon}
              primary
              size="sm"
              className={clsx('text-left')}
            >
              Folders
            </Button>
          </Link>
        )}
        {!authState.isAuthenticated && (
          <div className="flex items-center gap-6">
            <div className="flex gap-2">
              {router.pathname !== '/signup' && (
                <Button
                  size="sm"
                  primary
                  className={clsx('text-left')}
                  onClick={(e) => handleLoginSignupClick(e, true)}
                >
                  <div className="flex items-center gap-2">
                    <div className="shrink-0">Signup</div>
                  </div>
                </Button>
              )}
              {router.pathname !== '/login' && (
                <Button
                  link
                  size="sm"
                  className={clsx(
                    'dark:text-left dark:text-white',
                    router.pathname !== '/' ? 'text-gray-700' : 'text-white',
                  )}
                  onClick={handleLoginSignupClick}
                >
                  <div className="flex items-center gap-2">
                    <div className="shrink-0">Login</div>
                  </div>
                  <Icon
                    icon={ArrowRightIcon}
                    className="dark:text-white"
                    size="sm"
                  />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
