import React from 'react'

export function AppUI({
  moduleName,
  host,
  uiName,
  scheme,
}: {
  moduleName: string
  uiName: string
  host: string
  scheme: string
}) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  React.useEffect(() => {
    // Set the iframe's new HTML
    if (iframeRef.current?.contentWindow && moduleName && uiName) {
      iframeRef.current.src = `${scheme}//${uiName}.${moduleName}.modules.${host}`
    }
  }, [iframeRef.current?.contentWindow, moduleName, host, uiName, scheme])

  return (
    <div className="h-full w-full flex flex-col justify-stretch">
      <div className="w-full h-full">
        <iframe
          ref={iframeRef}
          className="w-full h-full"
          title={`module:${moduleName}`}
        />
      </div>
    </div>
  )
}
