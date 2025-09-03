import React from 'react'

import type { AppBrowserSdk } from '../../app-browser-sdk'
import { SdkContext } from './app-browser-sdk.provider'

export interface ISdkContext {
  isInitialized: AppBrowserSdk['isInitialized']
  apiClient: AppBrowserSdk['apiClient']
  authState: AppBrowserSdk['authenticator']['state']
  navigateTo: AppBrowserSdk['handleNavigateTo']
  currentPathAndQuery: string
  executeWorkerScriptUrl: AppBrowserSdk['executeWorkerScriptUrl']
}

export function useAppBrowserSdk(): ISdkContext {
  const appBrowserSdkContext = React.useContext(SdkContext)
  if (!Object.keys(appBrowserSdkContext).length) {
    throw new Error(
      'AppBrowserSdkContext not found. Please check if the AppBrowserSdkContextProvider is mounted.',
    )
  }
  return appBrowserSdkContext
}
