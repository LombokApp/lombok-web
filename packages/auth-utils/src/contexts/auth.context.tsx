import React from 'react'
import type { Authenticator } from '..'
import type { AuthenticatorStateType } from '../authenticator'
import {
  LoginCredentialsDTO,
  SignupCredentialsDTO,
  ViewerGetResponse,
} from '@stellariscloud/types'

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
}
const AuthContext = React.createContext<IAuthContext>({} as IAuthContext)

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
  const viewerRequested = React.useRef<Record<string, boolean>>({
    ___: false,
  })
  const [viewerRefreshKey, _setViewerRefreshKey] = React.useState('___')
  const [viewer, setViewer] = React.useState<{
    [key: string]: ViewerGetResponse['user'] | undefined
  }>()
  const [error, setError] = React.useState<AuthError>()
  const { isAuthenticated } = authState

  React.useEffect(() => {
    // Refresh the token to verify authentication state.
    authenticator
      .getAccessToken()
      .finally(() => {
        setAuthState(authenticator.state)
        const authStateSetter = (
          event: CustomEvent<AuthenticatorStateType>,
        ) => {
          setAuthState(event.detail)
        }

        authenticator.addEventListener(
          'onStateChanged',
          authStateSetter as EventListener,
        )

        return () => {
          authenticator.removeEventListener(
            'onStateChanged',
            authStateSetter as EventListener,
          )
        }
      })
      .catch((err) => setError(err as AuthError))
  }, [])

  const login = async (loginParams: LoginCredentialsDTO) => {
    setError(undefined)
    setIsLoggingIn(true)

    try {
      setError(undefined)
      try {
        const loginResult = await authenticator.login(loginParams)
        if (loginResult.response.status !== 201 || !loginResult.data) {
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
      if (signupResult.response.status !== 201 || !signupResult.data) {
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

  const logout = async () => {
    setError(undefined)
    setIsLoggingOut(true)
    await authenticator
      .logout()
      .then(() => (window.location.href = '/login'))
      .catch((err) => setError(err as AuthError))
      .finally(() => setIsLoggingOut(false))
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
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = (): IAuthContext => React.useContext(AuthContext)
