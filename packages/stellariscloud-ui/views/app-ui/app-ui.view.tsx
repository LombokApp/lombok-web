import React from 'react'

export function AppUI({
  appIdentifier,
  host,
  uiName,
  scheme,
}: {
  appIdentifier: string
  uiName: string
  host: string
  scheme: string
}) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  React.useEffect(() => {
    // Set the iframe's new HTML
    if (iframeRef.current?.contentWindow && appIdentifier && uiName) {
      iframeRef.current.src = `${scheme}//${uiName}.${appIdentifier}.apps.${host}`
    }
  }, [iframeRef.current?.contentWindow, appIdentifier, host, uiName, scheme])

  return (
    <div className="h-full w-full flex flex-col justify-stretch">
      <div className="w-full h-full">
        <iframe
          ref={iframeRef}
          className="w-full h-full"
          title={`app:${appIdentifier}`}
        />
      </div>
    </div>
  )
}
