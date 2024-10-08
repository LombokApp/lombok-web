import '../styles/globals.css'
import '../fonts/inter/inter.css'

import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
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
import { NavSidebar } from '../components/nav-sidebar/nav-sidebar'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild,
} from '@headlessui/react'
import Link from 'next/link'

const queryClient = new QueryClient()

const UNAUTHENTICATED_PAGES = ['/', '/faq', '/login', '/signup']
const SHOW_HEADER_ROUTES = ['/', '/sponsor', '/how-it-works', '/contact']

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

  const hideHeader = !SHOW_HEADER_ROUTES.includes(router.pathname)
  const hideSidebar = !hideHeader
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  return (
    <div className="flex h-full">
      <Dialog
        open={sidebarOpen}
        onClose={setSidebarOpen}
        className="relative z-50 lg:hidden"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-[closed]:opacity-0"
        />

        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-[closed]:-translate-x-full"
          >
            <TransitionChild>
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5 duration-300 ease-in-out data-[closed]:opacity-0">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="-m-2.5 p-2.5"
                >
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon
                    aria-hidden="true"
                    className="h-6 w-6 text-white"
                  />
                </button>
              </div>
            </TransitionChild>
            <NavSidebar
              authContext={authContext}
              hideSidebar={hideSidebar}
              menuItems={menuItems}
              router={router}
            />
          </DialogPanel>
        </div>
      </Dialog>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <NavSidebar
          authContext={authContext}
          hideSidebar={hideSidebar}
          menuItems={menuItems}
          router={router}
        />
      </div>

      <div className="sticky top-0 z-40 flex flex-col justify-between items-center gap-x-6 bg-gray-900 px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="-m-2.5 p-2.5 text-gray-400 lg:hidden"
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon aria-hidden="true" className="h-6 w-6" />
        </button>
        <Link href="/profile">
          <span className="sr-only">Your profile</span>
          <img
            alt=""
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
            className="h-8 w-8 rounded-full bg-gray-800"
          />
        </Link>
      </div>

      <main
        className={clsx('overflow-hidden flex-1', !hideSidebar && 'lg:pl-72')}
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
