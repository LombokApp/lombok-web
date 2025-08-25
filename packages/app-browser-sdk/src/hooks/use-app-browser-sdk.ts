import type { AuthenticatorStateType } from '@lombokapp/auth-utils'
import React from 'react'

import { AppBrowserSdk } from '../app-browser-sdk'
import type { AppBrowserSdkConfig } from '../types'

export function useAppBrowserSdk(config?: AppBrowserSdkConfig) {
  const [isInitialized, setIsInitialized] = React.useState(false)

  // Use refs to store the latest state setters and config callbacks
  const stateRef = React.useRef({
    setIsInitialized,
    onInitialize: config?.onInitialize,
  })

  // Update the ref with latest values on every render
  stateRef.current = {
    setIsInitialized,
    onInitialize: config?.onInitialize,
  }

  const [sdk] = React.useState<AppBrowserSdk>(() => {
    return new AppBrowserSdk({
      ...config,
      onInitialize: () => {
        stateRef.current.setIsInitialized(true)
        stateRef.current.onInitialize?.()
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

  return {
    isInitialized,
    apiClient: sdk.apiClient,
    authState,
    executeWorkerScriptUrl: sdk.executeWorkerScriptUrl,
  }
}
