import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'

import { ContentLayout } from '../../../components/sidebar/components/content-layout'
import { AppUI } from '../../../views/app-ui/app-ui.view'

const AppsIndexPage: NextPage = () => {
  const router = useRouter()
  const [location, setLocation] = React.useState<Location>()
  React.useEffect(() => {
    setLocation(window.location)
  }, [])
  return process.env.NEXT_PUBLIC_API_HOST ? (
    <div className="flex size-full flex-col justify-around">
      {location && (
        <ContentLayout
          breadcrumbs={[
            { label: 'Server', href: '/server' },
            { label: `App: ${router.query.appIdentifier as string}` },
          ]}
        >
          <AppUI
            scheme={location.protocol}
            appIdentifier={router.query.appIdentifier as string}
            host={process.env.NEXT_PUBLIC_API_HOST}
            uiName={router.query.uiName as string}
          />
        </ContentLayout>
      )}
    </div>
  ) : (
    <></>
  )
}

export default AppsIndexPage
