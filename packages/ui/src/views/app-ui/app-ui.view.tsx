import React from 'react'
import { useLocation } from 'react-router'

import { useTheme } from '@/src/contexts/theme'

export function AppUI({
  appIdentifier,
  host,
  scheme,
  getAccessTokens,
  shouldRelayNavigation = false,
  pathAndQuery,
  onNavigateTo,
}: {
  getAccessTokens: (
    appIdentifier: string,
  ) => Promise<{ accessToken: string; refreshToken: string }>
  appIdentifier: string
  pathAndQuery: string
  host: string
  scheme: string
  shouldRelayNavigation?: boolean
  onNavigateTo?: (to: { pathAndQuery: string }) => void
}) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  const [paths, setPaths] = React.useState({
    initial: pathAndQuery,
    parent: pathAndQuery,
    child: pathAndQuery,
  })

  const location = useLocation()
  React.useEffect(() => {
    const latestParentPathAndQuery = `${window.location.pathname.slice(`/apps/${appIdentifier}`.length)}${window.location.search}`
    if (latestParentPathAndQuery !== paths.child) {
      setPaths({
        child: paths.child,
        initial: paths.initial,
        parent: latestParentPathAndQuery,
      })
      if (shouldRelayNavigation && iframeRef.current?.contentWindow) {
        console.log(
          'Parent URL changed, relaying navigation reset to iframe:',
          `"${latestParentPathAndQuery}"`,
        )
        iframeRef.current.contentWindow.postMessage(
          {
            type: 'PARENT_NAVIGATE_TO',
            payload: { pathAndQuery: latestParentPathAndQuery },
          },
          '*',
        )
      }
    }
  }, [
    shouldRelayNavigation,
    location.pathname,
    location.search,
    paths.child,
    appIdentifier,
    paths.parent,
    paths.initial,
  ])

  const theme = useTheme()
  const srcUrl = React.useMemo(() => {
    return `${scheme}//${appIdentifier}.apps.${host}${paths.initial}`
  }, [appIdentifier, host, scheme, paths.initial])

  React.useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.src = srcUrl
    }
  }, [srcUrl])

  React.useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage(
        { type: 'THEME_CHANGE', payload: theme.theme },
        '*',
      )
    }
  }, [theme.theme])

  // Handle messages from the iframe
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from our iframe
      if (event.source !== iframeRef.current?.contentWindow) {
        return
      }

      const message = event.data as {
        type: string
        payload?: unknown
        id?: string
      }
      if (!message.type) {
        return
      }

      const processMessage = async () => {
        try {
          switch (message.type) {
            case 'APP_READY': {
              // console.log('Iframe is ready')
              // Iframe is ready, we can send initial data if needed
              const { accessToken, refreshToken } =
                await getAccessTokens(appIdentifier)
              if (!accessToken) {
                throw new Error('No access token available')
              }
              const response = {
                type: 'AUTHENTICATION',
                payload: {
                  accessToken,
                  refreshToken,
                  initialPathAndQuery: paths.initial,
                  theme: theme.theme,
                },
              }
              iframeRef.current?.contentWindow?.postMessage(response, '*')
              break
            }

            case 'APP_ERROR': {
              console.error('Iframe error:', message.payload)
              break
            }

            case 'NAVIGATE_TO': {
              console.log('(chid) Navigate to:', message.payload)
              const navigateToPayload = message.payload as {
                pathAndQuery: string
              }
              setPaths({
                ...paths,
                parent: navigateToPayload.pathAndQuery,
                child: navigateToPayload.pathAndQuery,
              })
              onNavigateTo?.(navigateToPayload)
              break
            }

            default:
              console.log('Unknown message type:', message.type)
          }
        } catch (error) {
          console.error('Error handling iframe message:', error)

          // Send error response if this was a request
          if (message.id) {
            const errorResponse = {
              type: 'error',
              payload: {
                message:
                  error instanceof Error ? error.message : 'Unknown error',
              },
              id: message.id,
            }
            iframeRef.current?.contentWindow?.postMessage(errorResponse, '*')
          }
        }
      }

      void processMessage()
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [getAccessTokens, appIdentifier, onNavigateTo, paths, theme])

  return (
    <div className="flex size-full flex-col justify-stretch">
      <div className="size-full">
        <iframe
          ref={iframeRef}
          className="size-full"
          title={`app:${appIdentifier}`}
        />
      </div>
    </div>
  )
}
