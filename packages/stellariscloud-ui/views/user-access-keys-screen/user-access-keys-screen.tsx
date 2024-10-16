import clsx from 'clsx'
import React from 'react'

import { PageHeading } from '../../design-system/page-heading/page-heading'
import { AccessKeyDTO } from '@stellariscloud/api-client'
import { apiClient } from '../../services/api'
import { EmptyState } from '../../design-system/empty-state/empty-state'
import { KeyIcon } from '@heroicons/react/24/outline'
import { AccessKeysList } from '../../components/access-keys-list/access-keys-list'

export function UserAccessKeysScreen() {
  const [accessKeys, setAccessKeys] = React.useState<AccessKeyDTO[]>()

  const fetchAccessKeys = React.useCallback(() => {
    void apiClient.accessKeysApi.listAccessKeys().then((resp) => {
      setAccessKeys(resp.data.result)
    })
  }, [])

  React.useEffect(() => {
    void fetchAccessKeys()
  }, [])

  return (
    <div
      className={clsx(
        'p-4 items-center flex flex-1 flex-col h-full overflow-x-hidden overflow-y-auto',
      )}
    >
      <div className="container flex-1 flex flex-col">
        <div className="pt-8">
          {(accessKeys?.length ?? 0) > 0 ? (
            <div className="flex flex-col gap-4 items-start">
              <AccessKeysList
                accessKeys={accessKeys ?? []}
                urlPrefix="/access-keys"
              />
            </div>
          ) : (
            <EmptyState
              icon={KeyIcon}
              text="No access keys have been created"
            />
          )}
        </div>
      </div>
    </div>
  )
}
