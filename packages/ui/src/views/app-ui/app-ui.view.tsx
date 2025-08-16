import React from 'react'

export function AppUI({
  appIdentifier,
  host,
  uiIdentifier,
  url,
  scheme,
  getAccessTokens,
  queryParams,
}: {
  getAccessTokens: () => Promise<{ accessToken: string; refreshToken: string }>
  appIdentifier: string
  uiIdentifier: string
  url: string
  host: string
  scheme: string
  queryParams: Record<string, string>
}) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  const srcUrl = React.useMemo(() => {
    const query = Object.entries(queryParams)
      .map(([key, value]) => `${key}=${value}`)
      .join('&')
    return `${scheme}//${uiIdentifier}.${appIdentifier}.apps.${host}${url ? url : ''}?${query}`
  }, [appIdentifier, host, queryParams, uiIdentifier, scheme, url])

  React.useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.src = srcUrl
    }
  }, [srcUrl])

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
              // Iframe is ready, we can send initial data if needed
              const { accessToken, refreshToken } = await getAccessTokens()
              if (!accessToken) {
                throw new Error('No access token available')
              }
              const response = {
                type: 'AUTHENTICATION',
                payload: {
                  accessToken,
                  refreshToken,
                },
              }
              iframeRef.current?.contentWindow?.postMessage(response, '*')
              break
            }

            case 'APP_ERROR': {
              console.error('Iframe error:', message.payload)
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
  }, [getAccessTokens])

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
