import React from 'react'

export function AppUI({
  appIdentifier,
  host,
  uiName,
  scheme,
  getAccessTokens,
}: {
  getAccessTokens: () => Promise<{ accessToken: string; refreshToken: string }>
  appIdentifier: string
  uiName: string
  host: string
  scheme: string
}) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  React.useEffect(() => {
    // Set the iframe's new HTML
    if (iframeRef.current?.contentWindow && appIdentifier && uiName) {
      iframeRef.current.src = `${scheme}//${uiName}.${appIdentifier}.apps.${host}?basePath=${scheme}//${host}`
    }
  }, [iframeRef.current?.contentWindow, appIdentifier, host, uiName, scheme])

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
