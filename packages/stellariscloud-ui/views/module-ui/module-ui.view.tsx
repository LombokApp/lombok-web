import { useRouter } from 'next/router'
import React from 'react'

export function ModulesUI({ moduleName }: { moduleName: string }) {
  const router = useRouter()

  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  React.useEffect(() => {
    // Set the iframe's new HTML
    if (iframeRef.current?.contentWindow && moduleName) {
      iframeRef.current.src = `http://main.${moduleName}.modules.stellariscloud.localhost:3002`
    }
  }, [iframeRef.current?.contentWindow])

  return (
    <div className="h-full w-full flex flex-col justify-stretch">
      <div className="w-full h-full">
        <iframe ref={iframeRef} className="w-full h-full" />
      </div>
    </div>
  )
}
