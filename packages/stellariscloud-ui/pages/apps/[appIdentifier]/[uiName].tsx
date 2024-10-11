import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'
import { AppWindow } from 'lucide-react'

import { AppUI } from '../../../views/app-ui/app-ui.view'
import { ContentLayout } from '../../../components/sidebar/components/content-layout'

const AppsIndexPage: NextPage = () => {
  const router = useRouter()
  const [location, setLocation] = React.useState<Location>()
  React.useEffect(() => {
    setLocation(window.location)
  }, [])
  return process.env.NEXT_PUBLIC_API_HOST ? (
    <div className="h-full w-full flex flex-col justify-around">
      {location && (
        <ContentLayout
          titleIcon={AppWindow}
          breadcrumbs={[
            { label: 'Server', href: '/server/dashboard' },
            { label: `App: ${router.query.appIdentifier}` },
          ]}
          description={
            'Manage and review access keys used by your current and recent folders'
          }
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
