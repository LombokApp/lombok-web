import { AccessKeyDTO } from '@stellariscloud/api-client'
import { ChevronRightIcon, KeyIcon } from '@heroicons/react/24/outline'
import { StackedList } from '../../design-system/stacked-list/stacked-list'
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
          href={`${urlPrefix}/${accessKey.accessKeyHashId}`}
        >
          <div className="flex justify-between flex-1 items-center gap-x-4 p-5 py-4">
            <div className="flex min-w-0 gap-x-4 items-center">
              <div className="w-12 h-12 p-2 border-yellow-500 border-2 rounded-full">
                <KeyIcon />
              </div>
              <div className="min-w-0 flex-auto">
                <p className="text-sm font-semibold leading-6">
                  <span className="absolute inset-x-0 -top-px bottom-0" />
                  <span>{accessKey.accessKeyHashId} - </span>
                  {accessKey.endpointDomain} - {accessKey.accessKeyId}
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
