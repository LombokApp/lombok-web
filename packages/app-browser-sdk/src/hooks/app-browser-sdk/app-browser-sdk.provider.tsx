import type { AuthenticatorStateType } from '@lombokapp/auth-utils'
import React from 'react'

import { AppBrowserSdk } from '../../app-browser-sdk'
import type { ISdkContext } from './app-browser-sdk.hook'

const SdkContext = React.createContext<ISdkContext>({} as ISdkContext)

export const AppBrowserSdkContextProvider = ({
  children,
  onNavigateTo,
  onInitialize,
  onThemeChange,
}: {
  children: React.ReactNode
  onNavigateTo?: (to: { pathAndQuery: string }) => void
  onInitialize?: () => void
  onThemeChange?: (theme: string) => void
}) => {
  const [isInitialized, setIsInitialized] = React.useState(false)

  // Use refs to store the latest state setters and config callbacks
  const stateRef = React.useRef({
    setIsInitialized,
    onInitialize,
    onThemeChange,
    onNavigateTo,
  })

  // Update the ref with latest values on every render
  stateRef.current = {
    setIsInitialized,
    onInitialize,
    onThemeChange,
    onNavigateTo,
  }

  const [sdk] = React.useState<AppBrowserSdk>(() => {
    return new AppBrowserSdk({
      onInitialize: () => {
        stateRef.current.setIsInitialized(true)
        stateRef.current.onInitialize?.()
      },
      onThemeChange: (theme) => {
        stateRef.current.onThemeChange?.(theme)
      },
      onNavigateTo: (to) => {
        stateRef.current.onNavigateTo?.({
          pathAndQuery: to.pathAndQuery.startsWith('/')
            ? to.pathAndQuery
            : `/${to.pathAndQuery}`,
        })
      },
    })
  })

  const [authState, setAuthState] = React.useState<AuthenticatorStateType>(
    sdk.authenticator.state,
  )

  React.useEffect(() => {
    const handleStateChange = () => {
      setAuthState(sdk.authenticator.state)
    }

    sdk.authenticator.addEventListener('onStateChanged', handleStateChange)

    return () => {
      sdk.authenticator.removeEventListener('onStateChanged', handleStateChange)
    }
  }, [sdk.authenticator])

  return (
    <SdkContext.Provider
      value={{
        isInitialized,
        apiClient: sdk.apiClient,
        theme: sdk.theme,
        authState,
        navigateTo: sdk.handleNavigateTo,
        currentPathAndQuery: sdk.initialData?.pathAndQuery ?? '',
        executeWorkerScriptUrl: sdk.executeWorkerScriptUrl,
      }}
    >
      {children}
    </SdkContext.Provider>
  )
}

export { SdkContext }
