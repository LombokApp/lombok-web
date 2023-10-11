import { capitalize } from '@stellariscloud/utils'
import clsx from 'clsx'
import { useRouter } from 'next/router'
import React from 'react'

import { PageHeading } from '../../design-system/page-heading/page-heading'
import { ServerUsers } from './list-server-users/list-server-users.view'
import { ServerOverview } from './server-overview/server-overview'
import { ServerSettingsScreen } from './server-settings-screen/server-settings-screen'
import { ServerStorageConfig } from './server-storage-config/server-storage-config.view'
import { ServerTabs } from './server-tabs'

export function ServerScreen() {
  const router = useRouter()

  const [activeTab, setActiveTab] = React.useState('info')
  React.useEffect(() => {
    if (typeof router.query.tab === 'string') {
      setActiveTab(router.query.tab)
    }
  }, [router.query.tab])

  const SERVER_INFO = {
    hostname: 'stellaris.wasteofpaper.com',
  }

  return (
    <>
      <div
        className={clsx(
          'items-center flex flex-1 flex-col gap-6 h-full px-6 overflow-y-auto',
        )}
      >
        <div className="container flex-1 flex flex-col">
          <div className="py-4 flex items-start gap-10">
            <PageHeading title={['Server', capitalize(activeTab)]} />
          </div>
          <div className="pb-6">
            <ServerTabs activeTab={activeTab} />
          </div>
          <div className="pt-8">
            {activeTab === 'info' && (
              <ServerOverview serverInfo={SERVER_INFO} />
            )}
            {activeTab === 'users' && <ServerUsers />}
            {activeTab === 'storage' && <ServerStorageConfig />}
            {activeTab === 'settings' && <ServerSettingsScreen />}
          </div>
        </div>
      </div>
    </>
  )
}
