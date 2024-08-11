import { AccessKeyDTO } from '@stellariscloud/api-client'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { StackedList } from '../../design-system/stacked-list/stacked-list'
import { Avatar } from '../../design-system/avatar'
import Link from 'next/link'

export function AccessKeysList({
  urlPrefix,
  accessKeys,
}: {
  accessKeys: AccessKeyDTO[]
  urlPrefix: string
}) {
  return (
    <StackedList
      items={accessKeys.map((accessKey, i) => (
        <Link
          className="w-full"
          href={`${urlPrefix}/${encodeURIComponent(accessKey.endpointDomain)}/${encodeURIComponent(accessKey.accessKeyId)}`}
        >
          <div className="flex justify-between flex-1 items-center gap-x-4">
            <div className="flex min-w-0 gap-x-4 items-center">
              <Avatar
                uniqueKey={accessKey.accessKeyId}
                size="sm"
                className="bg-gray-100 dark:bg-gray-50"
              />
              <div className="min-w-0 flex-auto">
                <p className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
                  <span className="absolute inset-x-0 -top-px bottom-0" />
                  {accessKey.endpointDomain} - {accessKey.accessKeyId}
                </p>
                <p className="mt-1 flex text-xs leading-5 text-gray-500 dark:text-white">
                  {accessKey.folderCount} folders
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-x-4">
              <ChevronRightIcon
                aria-hidden="true"
                className="h-5 w-5 flex-none text-gray-400"
              />
            </div>
          </div>
        </Link>
      ))}
    />
  )
}
