import './styles/globals.css'
import './fonts/inter/inter.css'

import { AuthContextProvider, useAuthContext } from '@stellariscloud/auth-utils'
import { cn, Toaster } from '@stellariscloud/ui-toolkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { Header } from './components/header'
import { Sidebar } from './components/sidebar/sidebar'
import { useSidebar } from './components/sidebar/use-sidebar'
import { LocalFileCacheContextProvider } from './contexts/local-file-cache.context'
import { LoggingContextProvider } from './contexts/logging.context'
import { ServerContextProvider } from './contexts/server.context'
import { ThemeProvider } from './contexts/theme.context'
import { useServerContext } from './hooks/use-server-context'
import { useStore } from './hooks/use-store'
import { LandingPage } from './pages'
import { AccessKeysPage } from './pages/access-keys'
import { FolderRoot } from './pages/folders/folder-root'
import { FoldersPage } from './pages/folders/folders'
import { Login } from './pages/login'
import { ServerIndexPage } from './pages/server'
import { Signup } from './pages/signup'
import { sdkInstance } from './services/api'

const queryClient = new QueryClient()

const UNAUTHENTICATED_PAGES = ['/', '/login', '/signup']
const SIDEBAR_PAGES = ['/access-keys', '/folders', '/server']

const Content = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/access-keys" element={<AccessKeysPage />} />
      <Route path="/folders" element={<FoldersPage />} />
      <Route path="/server/*" element={<ServerIndexPage />} />
      <Route path="/folders/*" element={<FolderRoot />} />
    </Routes>
  )
}

const UnauthenticatedContent = () => {
  return (
    <div className="flex h-full flex-col">
      <div className="absolute right-0 top-0 flex w-full shrink-0 grow-0 overflow-visible">
        <Header />
      </div>
      <main className={cn('flex-1 justify-center overflow-hidden')}>
        <div className={cn('relative flex size-full')}>
          <div className="relative w-full">
            <Content />
          </div>
        </div>
      </main>
    </div>
  )
}

const AuthenticatedContent = () => {
  const authContext = useAuthContext()
  const navigate = useNavigate()
  const location = useLocation()
  const { menuItems } = useServerContext()

  React.useEffect(() => {
    if (authContext.authState.isLoaded) {
      if (
        !authContext.authState.isAuthenticated &&
        !UNAUTHENTICATED_PAGES.includes(location.pathname)
      ) {
        void navigate('/login')
      } else if (
        authContext.authState.isAuthenticated &&
        UNAUTHENTICATED_PAGES.includes(location.pathname)
      ) {
        void navigate('/folders')
      }
    }
  }, [
    authContext.authState.isAuthenticated,
    authContext.authState.isLoaded,
    location.pathname,
    navigate,
  ])

  const sidebar = useStore(useSidebar, (x) => x)
  if (!sidebar) {
    return null
  }
  const { getOpenState, settings } = sidebar
  const sidebarDisabled =
    settings.disabled ||
    !SIDEBAR_PAGES.find((pagePrefix) =>
      location.pathname.startsWith(pagePrefix),
    )
  return (
    <div className="flex h-full">
      {!sidebarDisabled && (
        <Sidebar
          onSignOut={authContext.logout}
          authContext={authContext}
          menuItems={menuItems}
        />
      )}
      <main
        className={cn(
          'bg-background min-h-[calc(100vh_-_56px)] flex-1 transition-[margin-left] duration-300 ease-in-out',
          !sidebarDisabled && (!getOpenState() ? 'lg:ml-[70px]' : 'lg:ml-64'),
        )}
      >
        <Content />
      </main>
    </div>
  )
}

const AuthStateRouter = () => {
  const { authState } = useAuthContext()
  return (
    <div className="size-full">
      {authState.isAuthenticated && authState.isLoaded ? (
        <LocalFileCacheContextProvider>
          <ServerContextProvider>
            <AuthenticatedContent />
          </ServerContextProvider>
        </LocalFileCacheContextProvider>
      ) : (
        <UnauthenticatedContent />
      )}
      <Toaster />
    </div>
  )
}

export const App = () => (
  <LoggingContextProvider>
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthContextProvider authenticator={sdkInstance.authenticator}>
          <ThemeProvider>
            <AuthStateRouter />
          </ThemeProvider>
        </AuthContextProvider>
      </Router>
    </QueryClientProvider>
  </LoggingContextProvider>
)
