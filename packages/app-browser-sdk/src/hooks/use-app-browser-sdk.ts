import { useEffect, useRef, useState } from 'react'
import { AppBrowserSdk } from '../app-browser-sdk'
import type { AppBrowserSdkConfig, TokenData } from '../types'

export function useAppBrowserSdk(config: AppBrowserSdkConfig) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const sdkRef = useRef<AppBrowserSdk | null>(null)

  useEffect(() => {
    const initializeSdk = async () => {
      try {
        const sdk = new AppBrowserSdk({
          ...config,
          onError: (error) => {
            setError(error)
            config.onError?.(error)
          },
        })

        await sdk.initialize()
        sdkRef.current = sdk
        setIsInitialized(true)
        setError(null)
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to initialize SDK')
        setError(error)
        config.onError?.(error)
      }
    }

    initializeSdk()

    return () => {
      sdkRef.current?.destroy()
      sdkRef.current = null
      setIsInitialized(false)
    }
  }, [config.basePath, config.appId])

  const requestToken = async (): Promise<TokenData> => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    return sdkRef.current.requestToken()
  }

  const getApiClient = () => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    return sdkRef.current.getApiClient()
  }

  const getAuthenticator = () => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    return sdkRef.current.getAuthenticator()
  }

  return {
    isInitialized,
    error,
    sdk: sdkRef.current,
    requestToken,
    getApiClient,
    getAuthenticator,
  }
}
