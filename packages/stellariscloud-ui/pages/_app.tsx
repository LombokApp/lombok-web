import '../styles/common-base-styles.css'
import '../styles/globals.css'
import '../fonts/inter/inter.css'

import { Menu } from '@headlessui/react'
import {
  ArrowRightOnRectangleIcon,
  CubeIcon,
  FolderOpenIcon,
  KeyIcon,
  ServerStackIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { AuthContextProvider, useAuthContext } from '@stellariscloud/auth-utils'
import clsx from 'clsx'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'

import { Header } from '../components/header'
import { ThemeSwitch } from '../components/theme-switch/theme-switch'
import { LocalFileCacheContextProvider } from '../contexts/local-file-cache.context'
import { LoggingContextProvider } from '../contexts/logging.context'
import {
  ServerContextProvider,
  useServerContext,
} from '../contexts/server.context'
import { ThemeContextProvider } from '../contexts/theme.context'
import { Avatar } from '../design-system/avatar'
import { Icon } from '../design-system/icon'
import { sdkInstance } from '../services/api'

const queryClient = new QueryClient()

const UNAUTHENTICATED_PAGES = ['/', '/faq', '/login', '/signup']
const SHOW_HEADER_ROUTES = ['/', '/sponsor', '/how-it-works', '/contact']
const SIDEBAR_COLOR =
  // 'lg:bg-indigo-600 dark:lg:bg-indigo-800 transition duration-100'
  'bg-gradient-to-l from-indigo-900 to-indigo-950 dark:bg-gradient-to-r dark:from-blue-950 dark:to-indigo-950 transition duration-100'
const BODY_GRADIENT =
  'bg-gray-100 transition duration-100 dark:bg-gradient-to-r dark:from-blue-950 dark:to-indigo-950'

const UnauthenticatedContent = ({ Component, pageProps }: AppProps) => {
  return (
    <div className="h-full flex flex-col">
      <div className="w-full flex shrink-0 grow-0 absolute right-0 top-0 overflow-visible">
        <Header />
      </div>
      <main
        className={clsx('flex-1 justify-center overflow-hidden', BODY_GRADIENT)}
      >
        <div className={clsx('relative h-full w-full flex')}>
          <div className="relative w-full">
            <Component {...pageProps} />
          </div>
        </div>
      </main>
    </div>
  )
}

const AuthenticatedContent = ({ Component, pageProps }: AppProps) => {
  const { authState, viewer, logout } = useAuthContext()
  const handleLogoutPress = (
    e?:
      | React.MouseEvent<HTMLButtonElement>
      | React.MouseEvent<HTMLAnchorElement>
      | React.MouseEvent<HTMLLabelElement>,
  ) => {
    e?.preventDefault()
    void logout()
  }
  const router = useRouter()
  const { menuItems } = useServerContext()

  React.useEffect(() => {
    if (
      'isAuthenticated' in authState &&
      !authState.isAuthenticated &&
      !UNAUTHENTICATED_PAGES.includes(router.pathname)
    ) {
      void router.push('/')
    }
  }, [authState.isAuthenticated, authState, router])

  const navigation = [
    {
      name: 'Folders',
      href: '/folders',
      icon: FolderOpenIcon,
      current: router.pathname.startsWith('/folders'),
    },
    {
      name: 'Access Keys',
      href: '/access-keys',
      icon: KeyIcon,
      current: router.pathname.startsWith('/access-keys'),
    },
  ]

  const userNavigation = [{ name: 'Your profile', href: '/profile' }]
  const hideHeader = !SHOW_HEADER_ROUTES.includes(router.pathname)
  const hideSidebar = !hideHeader
  const scheme = 'http' //TODO: Fix!

  // console.log('appUIs:', appUIs)
  return (
    <div className="h-full overflow-hidden">
      <div
        className={clsx(
          hideSidebar && 'max-w-0 overflow-hidden opacity-0',
          'hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-20 lg:overflow-y-auto lg:pb-4',
          SIDEBAR_COLOR,
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex h-16 shrink-0 items-center justify-center">
            <Link href={'/'} passHref>
              <Image
                className="rounded-full"
                priority
                src="/stellariscloud.png"
                width={32}
                height={32}
                alt="Stellaris cloud logo"
              />
            </Link>
          </div>
          {viewer && (
            <div className="flex flex-col flex-1">
              <nav className="mt-8">
                <ul className="flex flex-col items-center space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={clsx(
                          item.current
                            ? 'bg-white/10 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-white/10',
                          'group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-semibold',
                        )}
                      >
                        <item.icon
                          className="h-6 w-6 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="sr-only">{item.name}</span>
                      </Link>
                    </li>
                  ))}
                  {menuItems.map((item, i) => (
                    <li key={i}>
                      <Link
                        href={item.href}
                        className={clsx(
                          router.pathname.startsWith(item.href)
                            ? 'bg-white/10 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-white/10',
                          'group flex gap-x-3 rounded-md p-1 text-sm leading-6 font-semibold',
                        )}
                      >
                        {item.iconPath ? (
                          <img
                            className="rounded-lg bg-black/50"
                            width={40}
                            height={40}
                            alt={item.label}
                            src={`${scheme}://${item.uiName}.${item.appIdentifier}.apps.${process.env.NEXT_PUBLIC_API_HOST}${item.iconPath}`}
                            aria-hidden="true"
                          />
                        ) : (
                          <>
                            <Icon size="md" icon={CubeIcon} />
                          </>
                        )}
                        <span className="sr-only">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="flex-1 flex flex-col items-center justify-end">
                <ul className="flex flex-col gap-6 pb-4">
                  <li>
                    <ul className="flex flex-col gap-2 pb-4">
                      {viewer.isAdmin && (
                        <li>
                          <Link
                            href={'/server'}
                            className={clsx(
                              router.pathname.startsWith('/server')
                                ? 'bg-white/10 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-white/10',
                              'group flex gap-x-3 rounded-full p-3 text-sm leading-6 font-semibold',
                            )}
                          >
                            <ServerStackIcon
                              className="h-6 w-6 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="sr-only">Server</span>
                          </Link>
                        </li>
                      )}
                      <li>
                        <Link
                          href={'/profile'}
                          className={clsx(
                            router.pathname.startsWith('/profile')
                              ? 'bg-white/10 text-white'
                              : 'text-gray-400 hover:text-white hover:bg-white/10',
                            'group flex gap-x-3 rounded-full p-3 text-sm leading-6 font-semibold',
                          )}
                        >
                          <UserIcon
                            className="h-6 w-6 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="sr-only">Profile</span>
                        </Link>
                      </li>
                    </ul>
                  </li>
                  <li>
                    <div className="flex flex-col items-center">
                      <ThemeSwitch />
                    </div>
                  </li>
                  {authState.isAuthenticated && (
                    <li>
                      <div className="flex justify-center">
                        <button onClick={handleLogoutPress}>
                          <Icon
                            size="md"
                            icon={ArrowRightOnRectangleIcon}
                            className="text-gray-100 dark:text-gray-400 hover:text-gray-500"
                          />
                        </button>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className={clsx(
          'flex flex-col h-full justify-stretch',
          !hideSidebar && 'lg:pl-20',
        )}
      >
        {!hideHeader && (
          <div className="w-full flex shrink-0 grow-0 absolute right-0 top-0 overflow-visible">
            <Header />
          </div>
        )}

        <main className={clsx('overflow-hidden flex-1', BODY_GRADIENT)}>
          <Component {...pageProps} />
        </main>
      </div>
    </div>
  )
}

const Layout = (appProps: AppProps) => {
  const [loaded, setLoaded] = React.useState(false)

  const listener = React.useCallback(() => {
    setLoaded(sdkInstance.authenticator.state.isLoaded)
  }, [])

  React.useEffect(() => {
    sdkInstance.authenticator.addEventListener('onStateChanged', listener)
    return () => {
      sdkInstance.authenticator.removeEventListener('onStateChanged', listener)
    }
  }, [listener])

  return (
    <LoggingContextProvider>
      <QueryClientProvider client={queryClient}>
        <AuthContextProvider authenticator={sdkInstance.authenticator}>
          <ThemeContextProvider>
            <Head>
              <meta
                name="viewport"
                content="initial-scale=1.0, width=device-width"
              />
              <link rel="icon" href="/favicon.ico" />
            </Head>
            <div className="w-full h-full" id="takeover-root">
              {loaded && sdkInstance.authenticator.state.isAuthenticated ? (
                <LocalFileCacheContextProvider>
                  <ServerContextProvider>
                    <AuthenticatedContent {...appProps} />
                  </ServerContextProvider>
                </LocalFileCacheContextProvider>
              ) : (
                <UnauthenticatedContent {...appProps} />
              )}
            </div>
          </ThemeContextProvider>
        </AuthContextProvider>
      </QueryClientProvider>
    </LoggingContextProvider>
  )
}

export default Layout
