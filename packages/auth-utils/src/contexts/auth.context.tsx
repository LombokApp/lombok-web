import type {
  CompleteSSOSignupDTO,
  LoginCredentialsDTO,
  SignupCredentialsDTO,
  SSOCallbackDTO,
  ViewerGetResponse,
} from '@lombokapp/types'
import React from 'react'
import { useNavigate } from 'react-router'

import type { Authenticator } from '..'
import type { AuthenticatorStateType } from '../authenticator'
export class AuthError extends Error {}
export interface IAuthContext {
  authError?: AuthError
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
  completeSSOSignup: (
    signupSSOParams: CompleteSSOSignupDTO,
  ) => ReturnType<Authenticator['completeSSOSignup']>
  handleSSOCallback: (
    provider: string,
    signupSSOParams: SSOCallbackDTO,
  ) => ReturnType<Authenticator['handleSSOCallback']>
  logout: () => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  getAccessToken: () => Promise<string | undefined>
  redirectToLogin: (hard?: boolean) => void
  clearError: () => void
}
const AuthContext = React.createContext<IAuthContext>({} as IAuthContext)

export const AuthContextProvider = ({
  children,
  authenticator,
  unauthenticatedPages,
}: {
  children: React.ReactNode
  authenticator: Authenticator
  unauthenticatedPages: string[]
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
  const [authError, setAuthError] = React.useState<AuthError>()
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
      .catch((err) => setAuthError(err as AuthError))
    return () => {
      authenticator.removeEventListener(
        'onStateChanged',
        authStateSetter as EventListener,
      )
    }
  }, [])

  const login = async (loginParams: LoginCredentialsDTO) => {
    setAuthError(undefined)
    setIsLoggingIn(true)

    try {
      setAuthError(undefined)
      try {
        const loginResult = await authenticator.login(loginParams)
        if (loginResult.response.status !== 201) {
          const loginError = new AuthError('Login failed', {
            cause: loginResult.data,
          })
          setAuthError(loginError)
        }
        return loginResult
      } catch (err: unknown) {
        setAuthError(err as AuthError)
        throw err
      }
    } finally {
      setIsLoggingIn(false)
    }
  }

  const signup = async (signupParams: SignupCredentialsDTO) => {
    setAuthError(undefined)
    setIsLoggingIn(true)
    try {
      const signupResult = await authenticator.signup(signupParams)
      if (signupResult.response.status !== 201) {
        const loginError = new AuthError('Signup failed', {
          cause: signupResult.data,
        })
        setAuthError(loginError)
      }
      return signupResult
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleSSOCallback = async (
    provider: string,
    signupParams: SSOCallbackDTO,
  ) => {
    setAuthError(undefined)
    setIsLoggingIn(true)
    try {
      const handleSSOResponse = await authenticator.handleSSOCallback(
        provider,
        signupParams,
      )

      if ('needsUsername' in handleSSOResponse) {
        const needsUsernameResponse = handleSSOResponse as {
          needsUsername: boolean
          provider: string
          providerUserInfo: {
            id: string
            email?: string
            name?: string
            picture?: string
          }
          signature: string
          expiry: string
          suggestedUsername: string
        }
        void navigate('/sso/username-selection', {
          state: {
            provider: needsUsernameResponse.provider,
            providerUserInfo: needsUsernameResponse.providerUserInfo,
            suggestedUsername: needsUsernameResponse.suggestedUsername,
            signature: needsUsernameResponse.signature,
            expiry: needsUsernameResponse.expiry,
          },
        })
      }
      return handleSSOResponse
    } catch (err: unknown) {
      const loginError = new AuthError('SSO Signup failed. Try again.', {
        cause: err,
      })
      setAuthError(loginError)
      void navigate('/login')
      throw err
    } finally {
      setIsLoggingIn(false)
    }
  }
  const completeSSOSignup = async (signupParams: CompleteSSOSignupDTO) => {
    setAuthError(undefined)
    setIsLoggingIn(true)
    try {
      const completeSSOResult =
        await authenticator.completeSSOSignup(signupParams)
      if (completeSSOResult.response.status !== 201) {
        const ssoSignupError = new AuthError('SSO Signup failed. Try again.', {
          cause: completeSSOResult.data,
        })

        setAuthError(ssoSignupError)
      }
      return completeSSOResult
    } catch (err: unknown) {
      setAuthError(err as AuthError)
      throw err
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
    setAuthError(undefined)
    setIsLoggingOut(true)

    await authenticator
      .logout()
      .catch((err) => setAuthError(err as AuthError))
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
        !unauthenticatedPages.includes(location.pathname)
      ) {
        redirectToLogin()
      } else if (
        authState.isAuthenticated &&
        unauthenticatedPages.includes(location.pathname)
      ) {
        void navigate('/folders')
      }
    }
  }, [authState.isAuthenticated, authState.isLoaded, navigate])

  const getAccessToken = React.useCallback(
    () => authenticator.getAccessToken(),
    [],
  )

  const verifyEmail = React.useCallback(
    (token: string) => authenticator.verifyEmail(token),
    [],
  )

  const clearError = React.useCallback(() => {
    setAuthError(undefined)
  }, [])

  React.useEffect(() => {
    const _authError = authError
    setTimeout(() => {
      if (_authError === authError) {
        clearError()
      }
    }, 2000)
  }, [authError])

  return (
    <AuthContext.Provider
      value={{
        authError,
        isLoggingIn,
        isAuthenticated,
        isLoggingOut,
        viewer: viewer?.[viewerRefreshKey],
        login,
        signup,
        completeSSOSignup,
        handleSSOCallback,
        logout,
        verifyEmail,
        authState,
        getAccessToken,
        redirectToLogin,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = (): IAuthContext => React.useContext(AuthContext)
