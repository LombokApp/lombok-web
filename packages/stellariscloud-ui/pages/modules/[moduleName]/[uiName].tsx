import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'

import { ModulesUI } from '../../../views/module-ui/module-ui.view'

const ModulesIndexPage: NextPage = () => {
  const router = useRouter()
  const [location, setLocation] = React.useState<Location>()
  React.useEffect(() => {
    setLocation(window.location)
  }, [])
  return process.env.NEXT_PUBLIC_API_HOST ? (
    <div className="h-full w-full flex flex-col justify-around">
      {location && (
        <ModulesUI
          scheme={location.protocol}
          moduleName={router.query.moduleName as string}
          host={process.env.NEXT_PUBLIC_API_HOST}
          uiName={router.query.uiName as string}
        />
      )}
    </div>
  ) : (
    <></>
  )
}

export default ModulesIndexPage
