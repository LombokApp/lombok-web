import type {
  LoginCredentialsDTO,
  SignupCredentialsDTO,
  ViewerGetResponse,
} from '@stellariscloud/types'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import type { Authenticator } from '..'
import type { AuthenticatorStateType } from '../authenticator'
export class AuthError extends Error {}
export interface IAuthContext {
  error?: AuthError
  authState: AuthenticatorStateType
  isLoggingIn: boolean
  isAuthenticated: boolean
  viewer?: ViewerGetResponse['user']
  isLoggingOut: boolean
  login: (
    loginParams: LoginCredentialsDTO,
  ) => ReturnType<Authenticator['login']>
  signup: (
    signupParams: SignupCredentialsDTO,
  ) => ReturnType<Authenticator['signup']>

  logout: () => Promise<void>
  getAccessToken: () => Promise<string | undefined>
  redirectToLogin: (hard?: boolean) => void
}
const AuthContext = React.createContext<IAuthContext>({} as IAuthContext)
export const UNAUTHENTICATED_PAGES = ['/', '/login', '/signup']
export const SIDEBAR_PAGES = ['/access-keys', '/folders', '/server', '/apps']

export const AuthContextProvider = ({
  children,
  authenticator,
}: {
  children: React.ReactNode
  authenticator: Authenticator
}) => {
  const [isLoggingIn, setIsLoggingIn] = React.useState(false)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const [authState, setAuthState] = React.useState<AuthenticatorStateType>(
    {} as AuthenticatorStateType,
  )
  const navigate = useNavigate()
  const viewerRequested = React.useRef<Record<string, boolean>>({
    ___: false,
  })
  const [viewerRefreshKey, _setViewerRefreshKey] = React.useState('___')
  const [viewer, setViewer] =
    React.useState<Record<string, ViewerGetResponse['user'] | undefined>>()
  const [error, setError] = React.useState<AuthError>()
  const { isAuthenticated } = authState

  React.useEffect(() => {
    // Refresh the token to verify authentication state.
    let authStateSetter: (event: CustomEvent<AuthenticatorStateType>) => void

    authenticator
      .getAccessToken()
      .finally(() => {
        setAuthState(authenticator.state)
        authStateSetter = (event: CustomEvent<AuthenticatorStateType>) => {
          setAuthState(event.detail)
        }

        authenticator.addEventListener(
          'onStateChanged',
          authStateSetter as EventListener,
        )
      })
      .catch((err) => setError(err as AuthError))
    return () => {
      authenticator.removeEventListener(
        'onStateChanged',
        authStateSetter as EventListener,
      )
    }
  }, [])

  const login = async (loginParams: LoginCredentialsDTO) => {
    setError(undefined)
    setIsLoggingIn(true)

    try {
      setError(undefined)
      try {
        const loginResult = await authenticator.login(loginParams)
        if (loginResult.response.status !== 201) {
          const loginError = new AuthError('Login failed', {
            cause: loginResult.data,
          })
          setError(loginError)
        }
        return loginResult
      } catch (err: unknown) {
        setError(err as AuthError)
        throw err
      }
    } finally {
      setIsLoggingIn(false)
    }
  }

  const signup = async (signupParams: SignupCredentialsDTO) => {
    setError(undefined)
    try {
      const signupResult = await authenticator.signup(signupParams)
      if (signupResult.response.status !== 201) {
        const loginError = new AuthError('Signup failed', {
          cause: signupResult.data,
        })
        setError(loginError)
      }
      return signupResult
    } finally {
      setIsLoggingIn(false)
    }
  }

  const redirectToLogin = (hard = false) => {
    if (
      typeof window !== 'undefined' &&
      window.location.pathname !== '/login'
    ) {
      if (hard) {
        window.location.href = '/login'
      } else {
        void navigate('/login')
      }
    }
  }

  const logout = async () => {
    setError(undefined)
    setIsLoggingOut(true)

    await authenticator
      .logout()
      .catch((err) => setError(err as AuthError))
      .finally(() => setIsLoggingOut(false))
    redirectToLogin()
  }

  React.useEffect(() => {
    if (
      authState.isAuthenticated &&
      !viewerRequested.current[viewerRefreshKey]
    ) {
      void authenticator.getViewer().then((user) => {
        setViewer((_viewerMap) => ({ [viewerRefreshKey]: user }))
      })
    }
  }, [authState.isAuthenticated, viewerRefreshKey])

  React.useEffect(() => {
    if (authState.isLoaded) {
      if (
        !authState.isAuthenticated &&
        !UNAUTHENTICATED_PAGES.includes(location.pathname)
      ) {
        redirectToLogin()
      } else if (
        authState.isAuthenticated &&
        UNAUTHENTICATED_PAGES.includes(location.pathname)
      ) {
        void navigate('/folders')
      }
    }
  }, [authState.isAuthenticated, authState.isLoaded, navigate])

  const getAccessToken = React.useCallback(
    () => authenticator.getAccessToken(),
    [],
  )

  return (
    <AuthContext.Provider
      value={{
        error,
        isLoggingIn,
        isAuthenticated,
        isLoggingOut,
        viewer: viewer?.[viewerRefreshKey],
        login,
        signup,
        logout,
        authState,
        getAccessToken,
        redirectToLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = (): IAuthContext => React.useContext(AuthContext)
