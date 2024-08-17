import { KeyIcon } from '@heroicons/react/24/outline'
import React from 'react'
import { EmptyState } from '../../../../design-system/empty-state/empty-state'
import { AccessKeyDTO } from '@stellariscloud/api-client'
import { apiClient } from '../../../../services/api'
import { AccessKeysList } from '../../../../components/access-keys-list/access-keys-list'

export function ServerAccessKeys() {
  const [accessKeys, setAccessKeys] = React.useState<AccessKeyDTO[]>()

  const fetchAccessKeys = React.useCallback(() => {
    void apiClient.serverAccessKeysApi.listServerAccessKeys().then((resp) => {
      setAccessKeys(resp.data.result)
    })
  }, [])

  React.useEffect(() => {
    void fetchAccessKeys()
  }, [])

  return (
    <div className="w-full">
      <dl className="divide-y divide-gray-100 dark:divide-gray-700">
        <div className="px-4 py-6 flex flex-col sm:gap-4 sm:px-0">
          <dt className="text-sm font-medium leading-6 text-gray-900 dark:text-gray-200 sm:col-span-3">
            <span className="text-xl">Access Keys In Use</span>
            <div className="mt-1 mr-4 font-normal text-sm leading-6 text-gray-500 dark:text-gray-400 sm:mt-0">
              Distinct server provisioned S3 credentials in use by all users
              across the server.
            </div>
          </dt>
          <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-5 sm:mt-0">
            {(accessKeys?.length ?? 0) > 0 ? (
              <div className="flex flex-col gap-4 items-start">
                <AccessKeysList
                  accessKeys={accessKeys ?? []}
                  urlPrefix="/server/storage/keys"
                />
              </div>
            ) : (
              <EmptyState
                icon={KeyIcon}
                text="No access keys have been created"
              />
            )}
          </dd>
        </div>
      </dl>
    </div>
  )
}
