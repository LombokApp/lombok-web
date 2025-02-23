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
      <dl>
        <div className="px-4 py-6 flex flex-col sm:gap-4 sm:px-0">
          <dd className="mt-1 text-sm leading-6 sm:col-span-5 sm:mt-0">
            {(accessKeys?.length ?? 0) > 0 ? (
              <div className="flex flex-col gap-4 items-start">
                <AccessKeysList
                  accessKeys={accessKeys ?? []}
                  urlPrefix="/server/storage/keys"
                />
              </div>
            ) : (
              <EmptyState icon={KeyIcon} text="No access keys are in use" />
            )}
          </dd>
        </div>
      </dl>
    </div>
  )
}
