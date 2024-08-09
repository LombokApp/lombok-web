import { AccessKeyDTO } from '@stellariscloud/api-client'
import {
  ArrowPathIcon,
  ChevronRightIcon,
  KeyIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { Table } from '../../design-system/table/table'
import { Icon } from '../../design-system/icon'
import { ButtonGroup } from '../../design-system/button-group/button-group'
import { randomCharacters } from '@stellariscloud/utils'
import { StackedList } from '../../design-system/stacked-list/stacked-list'
import { Badge } from '../../design-system/badge/badge'
import { Avatar } from '../../design-system/avatar'

const DUMMY_IMAGE_URL =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'

export function AccessKeysList({
  accessKeys,
  onRotateAccessKey,
}: {
  accessKeys: AccessKeyDTO[]
  onRotateAccessKey: (
    accessKeyId: string,
    newAccessKey: { accessKeyId: string; secretAccessKey: string },
  ) => void
}) {
  return (
    <StackedList
      items={accessKeys.map((accessKey, i) => (
        <>
          <div className="flex min-w-0 gap-x-4 items-center">
            <Avatar
              uniqueKey={accessKey.accessKeyId}
              size="sm"
              className="bg-gray-100 dark:bg-gray-50"
            />
            <div className="min-w-0 flex-auto">
              <p className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
                <span className="absolute inset-x-0 -top-px bottom-0" />
                {accessKey.endpointHost} - {accessKey.accessKeyId}
              </p>
              <p className="mt-1 flex text-xs leading-5 text-gray-500 dark:text-white">
                {accessKey.folderCount} folders
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-x-4">
            <div className="hidden sm:flex sm:flex-col sm:items-end">
              <ButtonGroup
                buttons={[
                  {
                    name: 'Rotate Access Key',
                    icon: ArrowPathIcon,
                    onClick: () =>
                      onRotateAccessKey(accessKey.accessKeyId, {
                        accessKeyId: randomCharacters(8),
                        secretAccessKey: randomCharacters(8),
                      }),
                  },
                ]}
              />
            </div>
            <ChevronRightIcon
              aria-hidden="true"
              className="h-5 w-5 flex-none text-gray-400"
            />
          </div>
        </>
      ))}
    />
  )
}
