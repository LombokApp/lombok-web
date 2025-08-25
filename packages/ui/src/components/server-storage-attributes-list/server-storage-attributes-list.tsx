import type { StorageProvisionDTO } from '@lombokapp/types'
import { Badge, cn } from '@lombokapp/ui-toolkit'

const ROW_SPACING = 'px-4 py-3'
const LABEL_TEXT_COLOR = 'opacity-50'
const VALUE_TEXT_COLOR = ''

export function ServerStorageAttributesList({
  storageProvision,
}: {
  storageProvision?: StorageProvisionDTO
}) {
  return (
    <div className="rounded-lg pl-4 dark:rounded-none">
      <dl className="divide-y divide-white/10">
        <div
          className={cn('sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0', ROW_SPACING)}
        >
          <dt className={cn('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}>
            Label
          </dt>
          <dd
            className={cn(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            {storageProvision?.label ? (
              storageProvision.label
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
            {storageProvision?.accessKeyId}
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
            Endpoint
          </dt>
          <dd
            className={cn(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            {typeof storageProvision === 'undefined' ? (
              <span className="italic opacity-50">Unknown</span>
            ) : (
              storageProvision.endpoint
            )}
          </dd>
        </div>
        <div
          className={cn('sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0', ROW_SPACING)}
        >
          <dt className={cn('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}>
            Bucket
          </dt>
          <dd
            className={cn(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            {typeof storageProvision === 'undefined' ? (
              <span className="italic opacity-50">Unknown</span>
            ) : (
              storageProvision.bucket
            )}
          </dd>
        </div>
        <div
          className={cn('sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0', ROW_SPACING)}
        >
          <dt className={cn('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}>
            Prefix
          </dt>
          <dd
            className={cn(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            {typeof storageProvision === 'undefined' ? (
              <span className="italic opacity-50">Unknown</span>
            ) : (
              storageProvision.prefix
            )}
          </dd>
        </div>
        <div
          className={cn('sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0', ROW_SPACING)}
        >
          <dt className={cn('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}>
            Region
          </dt>
          <dd
            className={cn(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            {typeof storageProvision === 'undefined' ? (
              <span className="italic opacity-50">Unknown</span>
            ) : (
              storageProvision.region
            )}
          </dd>
        </div>
        <div
          className={cn('sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0', ROW_SPACING)}
        >
          <dt className={cn('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}>
            Permissions
          </dt>
          <dd
            className={cn(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            <div className="flex gap-2">
              {typeof storageProvision === 'undefined' ? (
                <span className="italic opacity-50">Unknown</span>
              ) : !storageProvision.provisionTypes.length ? (
                <span className="italic opacity-50">None</span>
              ) : (
                storageProvision.provisionTypes.map((provisionType, i) => (
                  <Badge key={i}>{provisionType}</Badge>
                ))
              )}
            </div>
          </dd>
        </div>
      </dl>
    </div>
  )
}
