import '../styles/common-base-styles.css'
import '../styles/globals.css'
import '../fonts/inter/inter.css'

import { FolderOpenIcon, KeyIcon } from '@heroicons/react/24/outline'
import { AuthContextProvider, useAuthContext } from '@stellariscloud/auth-utils'
import clsx from 'clsx'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useRouter } from 'next/router'
import React from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'

import { Header } from '../components/header'
import { LocalFileCacheContextProvider } from '../contexts/local-file-cache.context'
import { LoggingContextProvider } from '../contexts/logging.context'
import {
  ServerContextProvider,
  useServerContext,
} from '../contexts/server.context'
import { ThemeContextProvider } from '../contexts/theme.context'
import { sdkInstance } from '../services/api'
import { NavSidebar } from '../components/nav-sidebar/nav-sidebar'

const queryClient = new QueryClient()

const UNAUTHENTICATED_PAGES = ['/', '/faq', '/login', '/signup']
const SHOW_HEADER_ROUTES = ['/', '/sponsor', '/how-it-works', '/contact']

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
  const authContext = useAuthContext()
  const handleLogoutPress = (
    e?:
      | React.MouseEvent<HTMLButtonElement>
      | React.MouseEvent<HTMLAnchorElement>
      | React.MouseEvent<HTMLLabelElement>,
  ) => {
    e?.preventDefault()
    void authContext.logout()
  }
  const router = useRouter()
  const { menuItems } = useServerContext()

  React.useEffect(() => {
    if (
      'isAuthenticated' in authContext.authState &&
      !authContext.authState.isAuthenticated &&
      !UNAUTHENTICATED_PAGES.includes(router.pathname)
    ) {
      void router.push('/')
    }
  }, [authContext.authState.isAuthenticated, authContext.authState, router])

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
      {authContext.viewer && (
        <NavSidebar
          authContext={authContext}
          router={router}
          menuItems={menuItems}
          hideSidebar={hideSidebar}
        />
      )}

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
