import '../styles/common-base-styles.css'
import '../styles/globals.css'
import '../fonts/inter/inter.css'

import { Menu, Transition } from '@headlessui/react'
import { FolderIcon, KeyIcon } from '@heroicons/react/24/outline'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthContextProvider, useAuthContext } from '@stellariscloud/auth-utils'
import { NavLink } from '@stellariscloud/design-system'
import clsx from 'clsx'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import Image from 'next/image'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'

import { Header } from '../components/header'
import { ThemeSwitch } from '../components/theme-switch/theme-switch'
import { LocalFileCacheContextProvider } from '../contexts/local-file-cache.context'
import { LoggingContextProvider } from '../contexts/logging.context'
import { ThemeContextProvider } from '../contexts/theme.context'
import { authenticator } from '../services/api'

const queryClient = new QueryClient()

const UNAUTHENTICATED_PAGES = ['/', '/faq', '/login', '/signup']

export function ProfileMenu({
  profileImgSrc = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  profileMenuItems,
}: {
  profileImgSrc?: string
  profileMenuItems: { name: string; href: string; onClick?: () => void }[]
  profileName: string
}) {
  return (
    <Menu as="div" className="relative">
      <Menu.Button className="-m-1.5 flex items-center p-1.5">
        <span className="sr-only">Open user menu</span>
        <img
          className="h-8 w-8 rounded-full bg-gray-50"
          src={profileImgSrc}
          alt=""
        />
      </Menu.Button>
      <Transition
        as={React.Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
          {profileMenuItems.map((item) => (
            <Menu.Item key={item.name}>
              {({ active }) => (
                <NextLink
                  passHref
                  href={item.href}
                  className={clsx(
                    active ? 'bg-gray-50' : '',
                    'no-underline block px-3 py-1 text-sm leading-6 text-gray-900 dark:text-gray-400',
                  )}
                  onClick={item.onClick}
                >
                  {item.name}
                </NextLink>
              )}
            </Menu.Item>
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  )
}

const UnauthenticatedContent = ({ Component, pageProps }: AppProps) => {
  return (
    <div className="h-full flex flex-col dark:bg-gray-900">
      <div className="flex shrink-0 grow-0 absolute right-0 top-0 overflow-visible">
        <Header />
      </div>
      <main className={'flex-1 justify-center overflow-hidden'}>
        <div className={clsx('relative h-full w-full flex')}>
          <div className="relative w-full">
            {/* TODO: Fix this type issue on "AppProps['Component']" */}
            {/* @ts-expect-error - some type issue with AppProps['Component']  */}
            <Component {...pageProps} />
          </div>
        </div>
      </main>
    </div>
  )
}

const AuthenticatedContent = ({ Component, pageProps }: AppProps) => {
  const { authState, logout } = useAuthContext()

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
      icon: FolderIcon,
      current: router.pathname.startsWith('/folders'),
    },
    {
      name: 'Connections',
      href: '/s3-connections',
      icon: KeyIcon,
      current: router.pathname.startsWith('/s3-connections'),
    },
  ]

  const userNavigation = [
    { name: 'Your profile', href: '/profile' },
    { name: 'Sign out', href: '', onClick: handleLogoutPress },
  ]

  const SIDEBAR_COLOR =
    'lg:bg-indigo-600 dark:lg:bg-indigo-800 transition duration-100'
  const BODY_COLOR = 'bg-gray-100 dark:bg-slate-900 transition duration-100'
  return (
    <div className="h-full overflow-hidden">
      <div
        className={clsx(
          'hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-20 lg:overflow-y-auto lg:pb-4',
          SIDEBAR_COLOR,
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex h-16 shrink-0 items-center justify-center">
            <Image
              className="rounded-full"
              priority
              src="/stellariscloud.png"
              width={32}
              height={32}
              alt="Stellaris cloud logo"
            />
          </div>
          <div className="flex flex-col flex-1">
            <nav className="mt-8">
              <ul className="flex flex-col items-center space-y-1">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <NavLink
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
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="flex-1 flex flex-col items-center justify-end">
              <ul className="flex flex-col gap-6 pb-4">
                <li>
                  <ThemeSwitch />
                </li>
                <li>
                  <ProfileMenu
                    profileMenuItems={userNavigation}
                    profileName="Tom Kek"
                  />
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:pl-20 flex flex-col h-full">
        <main className={clsx('overflow-hidden flex-1', BODY_COLOR)}>
          {/* TODO: Fix this type issue on "AppProps['Component']" */}
          {/* @ts-expect-error - some type issue with AppProps['Component']  */}
          <Component {...pageProps} />
        </main>
      </div>
    </div>
  )
}

const Layout = (appProps: AppProps) => {
  const [loaded, setLoaded] = React.useState(false)

  const listener = React.useCallback(() => {
    setLoaded(authenticator.state.isLoaded)
  }, [])

  React.useEffect(() => {
    authenticator.addEventListener('onStateChanged', listener)
    return () => {
      authenticator.removeEventListener('onStateChanged', listener)
    }
  }, [listener])

  return (
    <GoogleOAuthProvider
      clientId={process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ?? ''}
    >
      <LoggingContextProvider>
        <QueryClientProvider client={queryClient}>
          <AuthContextProvider authenticator={authenticator}>
            <LocalFileCacheContextProvider>
              <ThemeContextProvider>
                <Head>
                  <meta
                    name="viewport"
                    content="initial-scale=1.0, width=device-width"
                  />
                  <link rel="icon" href="/favicon.ico" />
                </Head>
                <div className="w-full h-full" id="takeover-root">
                  {loaded && authenticator.state.isAuthenticated ? (
                    <AuthenticatedContent {...appProps} />
                  ) : (
                    <UnauthenticatedContent {...appProps} />
                  )}
                </div>
              </ThemeContextProvider>
            </LocalFileCacheContextProvider>
          </AuthContextProvider>
        </QueryClientProvider>
      </LoggingContextProvider>
    </GoogleOAuthProvider>
  )
}

export default Layout
