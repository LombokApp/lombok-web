import type { AppDTO } from '@stellariscloud/api-client'
import clsx from 'clsx'
import React from 'react'

import { PageHeading } from '../../../../design-system/page-heading/page-heading'
import { apiClient } from '../../../../services/api'
import { useRouter } from 'next/router'
import { AppAttributeList } from '../../../../components/app-attribute-list/app-attribute-list'

export function ServerAppDetailScreen() {
  const router = useRouter()
  const [app, setApp] = React.useState<AppDTO>()
  React.useEffect(() => {
    if (typeof router.query.appIdentifier === 'string' && !app) {
      void apiClient.appsApi
        .getApp({ appIdentifier: router.query.appIdentifier })
        .then((u) => setApp(u.data.app))
    }
  }, [app, router.query.appIdentifier])

  return (
    <div
      className={clsx(
        'items-center flex flex-1 flex-col gap-6 h-full overflow-y-auto px-4',
      )}
    >
      <div className="container flex-1 flex flex-col">
        <div className="py-4 flex items-start gap-10">
          <PageHeading
            titleIconBg={'bg-green-200'}
            avatarKey={app?.identifier ?? undefined}
            title={[`App: ${app?.identifier}`]}
            avatarSize="md"
          />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 justify-between items-start">
            <div className="flex-1">
              <AppAttributeList app={app} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
