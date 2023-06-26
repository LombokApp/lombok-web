import '../styles/common-base-styles.css'
import '../styles/globals.css'
import '../styles/fonts.css'

import { GoogleOAuthProvider } from '@react-oauth/google'
import {
  AuthContextProvider,
  Authenticator,
  useAuthContext,
} from '@stellariscloud/auth-utils'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useRouter } from 'next/router'
import React from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'

import { Header } from '../components/header'
import { NavSidebar } from '../components/nav-siderbar/nav-sidebar'
import { LocalFileCacheContextProvider } from '../contexts/local-file-cache.context'
import { LoggingContextProvider } from '../contexts/logging.context'
import { setupInterceptors } from '../services/stellariscloud-api/api'
import { LogPanel } from '../views/log-panel/log-panel.view'

const queryClient = new QueryClient()

const UNAUTHENTICATED_PAGES = ['/', '/faq', 'google-auth-callback']
const Content = ({ Component, pageProps }: AppProps) => {
  const { authState } = useAuthContext()
  const router = useRouter()
  const [showLogPanel, _setShowLogPanel] = React.useState(false)

  // On logout.
  React.useEffect(() => {
    if (
      'isAuthenticated' in authState &&
      !authState.isAuthenticated &&
      !UNAUTHENTICATED_PAGES.includes(router.pathname)
    ) {
      void router.push('/')
    }
  }, [authState.isAuthenticated, authState, router])
  return (
    <div className="h-full flex flex-col" id="takeover-root">
      <div className="flex shrink-0 grow-0 absolute right-0 top-0 overflow-visible">
        <Header />
      </div>
      <main className={'flex-1 justify-center overflow-hidden'}>
        <div className="relative h-full w-full flex pl-16">
          <div className="absolute left-0 top-0 bottom-0 bg-black/[.4] z-30">
            {authState.isAuthenticated && <NavSidebar />}
          </div>
          <div className="relative w-full">
            <Component {...pageProps} />
          </div>
        </div>
      </main>
      {showLogPanel && <div>{authState.isAuthenticated && <LogPanel />}</div>}
    </div>
  )
}

export const authenticator = new Authenticator({
  basePath: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
})

setupInterceptors(
  () => authenticator.getAccessToken(),
  () => authenticator.logout(),
)

const Layout = (appProps: AppProps) => {
  return (
    <GoogleOAuthProvider
      clientId={process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ?? ''}
    >
      <LoggingContextProvider>
        <QueryClientProvider client={queryClient}>
          <AuthContextProvider authenticator={authenticator}>
            <LocalFileCacheContextProvider>
              <Head>
                <meta
                  name="viewport"
                  content="initial-scale=1.0, width=device-width"
                />
                <link rel="icon" href="/favicon.ico" />
              </Head>
              <Content {...appProps} />
            </LocalFileCacheContextProvider>
          </AuthContextProvider>
        </QueryClientProvider>
      </LoggingContextProvider>
    </GoogleOAuthProvider>
  )
}

export default Layout
