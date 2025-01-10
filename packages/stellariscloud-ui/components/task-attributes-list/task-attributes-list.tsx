import type { AccessKeyDTO } from '@stellariscloud/api-client'
import { cn } from '@stellariscloud/ui-toolkit'

const ROW_SPACING = 'px-4 py-3'
const LABEL_TEXT_COLOR = 'text-gray-500 dark:text-white'
const VALUE_TEXT_COLOR = 'text-black dark:text-white'

export function TaskAttributeList({ accessKey }: { accessKey?: AccessKeyDTO }) {
  return (
    <div className="rounded-lg bg-gray-200 pl-4 dark:rounded-none dark:bg-transparent">
      <dl className="divide-y divide-white/10">
        <div
          className={cn('sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0', ROW_SPACING)}
        >
          <dt className={cn('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}>
            Domain
          </dt>
          <dd
            className={cn(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            {accessKey?.endpointDomain ? (
              accessKey.endpointDomain
            ) : (
              <span className="italic opacity-50">None</span>
            )}
          </dd>
        </div>
        <div
          className={cn('sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0', ROW_SPACING)}
        >
          <dt className={cn('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}>
            Access Key ID
          </dt>
          <dd
            className={cn(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            {accessKey?.accessKeyId}
          </dd>
        </div>
        <div
          className={cn('sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0', ROW_SPACING)}
        >
          <dt className={cn('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}>
            Secret Access Key
          </dt>
          <dd
            className={cn(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            **********
          </dd>
        </div>
        <div
          className={cn('sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0', ROW_SPACING)}
        >
          <dt className={cn('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}>
            Folder Count
          </dt>
          <dd
            className={cn(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            {typeof accessKey === 'undefined' ? (
              <span className="italic opacity-50">Unknown</span>
            ) : (
              accessKey.folderCount
            )}
          </dd>
        </div>
      </dl>
    </div>
  )
}
