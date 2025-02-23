import '../styles/globals.css'
import '../fonts/inter/inter.css'

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
import { ThemeProvider } from '../contexts/theme.context'
import { sdkInstance } from '../services/api'
import { Sidebar } from '../components/sidebar/sidebar'
import { useSidebar } from '../components/sidebar/use-sidebar'
import { useStore } from '../hooks/use-store'
import { cn } from '@stellariscloud/ui-toolkit'

const queryClient = new QueryClient()

const UNAUTHENTICATED_PAGES = ['/', '/faq', '/login', '/signup']

const UnauthenticatedContent = ({ Component, pageProps }: AppProps) => {
  return (
    <div className="h-full flex flex-col">
      <div className="w-full flex shrink-0 grow-0 absolute right-0 top-0 overflow-visible">
        <Header />
      </div>
      <main className={clsx('flex-1 justify-center overflow-hidden')}>
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

  const sidebar = useStore(useSidebar, (x) => x)
  if (!sidebar) return null
  const { getOpenState, settings } = sidebar

  return (
    <div className="flex h-full">
      <Sidebar
        onSignOut={async () => {
          authContext.logout()
          router.push('/login')
        }}
        authContext={authContext}
        menuItems={menuItems}
        router={router}
      />
      <main
        className={cn(
          'flex-1 min-h-[calc(100vh_-_56px)] bg-background transition-[margin-left] ease-in-out duration-300',
          !settings.disabled && (!getOpenState() ? 'lg:ml-[70px]' : 'lg:ml-72'),
        )}
      >
        <Component {...pageProps} />
      </main>
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
          <ThemeProvider
            attribute="data-mode"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
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
          </ThemeProvider>
        </AuthContextProvider>
      </QueryClientProvider>
    </LoggingContextProvider>
  )
}

export default Layout
