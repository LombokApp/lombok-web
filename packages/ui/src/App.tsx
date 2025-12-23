import './styles/globals.css'
import './fonts/inter/inter.css'

import { AuthContextProvider, useAuthContext } from '@lombokapp/auth-utils'
import { Toaster } from '@lombokapp/ui-toolkit/components/toaster'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from 'react-router'

import { Header } from './components/header'
import { Sidebar } from './components/sidebar/sidebar'
import { useSidebar } from './components/sidebar/use-sidebar'
import { SIDEBAR_PAGES, UNAUTHENTICATED_PAGES } from './constants'
import { LocalFileCacheContextProvider } from './contexts/local-file-cache'
import { LoggingContextProvider } from './contexts/logging'
import { PublicSettingsContextProvider } from './contexts/public-settings'
import { ServerContextProvider, useServerContext } from './contexts/server'
import { ThemeProvider } from './contexts/theme'
import { useStore } from './hooks/use-store'
import { LandingPage } from './pages'
import { AppUIContainer } from './pages/apps/app-ui-container'
import { FolderRoot } from './pages/folders/folder-root'
import { FoldersPage } from './pages/folders/folders'
import { Login } from './pages/login'
import { ServerIndexPage } from './pages/server'
import { SettingsIndexPage } from './pages/settings'
import { Signup } from './pages/signup'
import { SSOCallbackPage } from './pages/sso-callback'
import { SSOUsernameSelectionPage } from './pages/sso-username-selection'
import { sdkInstance } from './services/api'

const queryClient = new QueryClient()

const Content = ({ authenticated }: { authenticated: boolean }) => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/folders"
        element={authenticated ? <FoldersPage /> : <></>}
      />
      <Route
        path="/settings/*"
        element={authenticated ? <SettingsIndexPage /> : <></>}
      />
      <Route
        path="/server/*"
        element={authenticated ? <ServerIndexPage /> : <></>}
      />
      <Route
        path="/folders/*"
        element={authenticated ? <FolderRoot /> : <></>}
      />
      <Route
        path="/apps/*"
        element={authenticated ? <AppUIContainer /> : <></>}
      />
      <Route path="/login" element={!authenticated ? <Login /> : <></>} />
      <Route path="/signup" element={!authenticated ? <Signup /> : <></>} />
      <Route
        path="/sso/callback/:provider"
        element={!authenticated ? <SSOCallbackPage /> : <></>}
      />
      <Route
        path="/sso/username-selection"
        element={!authenticated ? <SSOUsernameSelectionPage /> : <></>}
      />
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
            <Content authenticated={false} />
          </div>
        </div>
      </main>
    </div>
  )
}

const AuthenticatedContent = () => {
  const authContext = useAuthContext()
  const location = useLocation()
  const { appContributions } = useServerContext()

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
          sidebarMenuLinkContributions={
            appContributions.sidebarMenuContributions.all
          }
        />
      )}
      <main
        className={cn(
          'bg-foreground/[.01] min-h-[calc(100vh_-_56px)] flex-1 transition-[margin-left] duration-300 ease-in-out max-w-full',
          !sidebarDisabled
            ? !getOpenState()
              ? 'lg:max-w-[calc(100vw_-_70px)]'
              : 'lg:max-w-[calc(100vw_-_256px)]'
            : 'w-full',
          !sidebarDisabled && (!getOpenState() ? 'lg:ml-[70px]' : 'lg:ml-64'),
        )}
      >
        <Content authenticated={true} />
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
      <PublicSettingsContextProvider>
        <Router>
          <AuthContextProvider
            authenticator={sdkInstance.authenticator}
            unauthenticatedPages={UNAUTHENTICATED_PAGES}
          >
            <ThemeProvider>
              <AuthStateRouter />
            </ThemeProvider>
          </AuthContextProvider>
        </Router>
      </PublicSettingsContextProvider>
    </QueryClientProvider>
  </LoggingContextProvider>
)
