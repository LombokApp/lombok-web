import { UserStorageProvisionDTO } from '@stellariscloud/api-client'
import clsx from 'clsx'
import { Badge } from '@stellariscloud/ui-toolkit'

const ROW_SPACING = 'px-4 py-3'
const LABEL_TEXT_COLOR = 'opacity-50'
const VALUE_TEXT_COLOR = ''

export function ServerStorageProvisionAttributesList({
  userStorageProvision,
}: {
  userStorageProvision?: UserStorageProvisionDTO
}) {
  return (
    <div className="rounded-lg dark:rounded-none pl-4">
      <dl className="divide-y divide-white/10">
        <div
          className={clsx(
            'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
            ROW_SPACING,
          )}
        >
          <dt
            className={clsx('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}
          >
            Label
          </dt>
          <dd
            className={clsx(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            {userStorageProvision?.label ? (
              userStorageProvision.label
            ) : (
              <span className="italic opacity-50">None</span>
            )}
          </dd>
        </div>
        <div
          className={clsx(
            'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
            ROW_SPACING,
          )}
        >
          <dt
            className={clsx('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}
          >
            Access Key ID
          </dt>
          <dd
            className={clsx(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            {userStorageProvision?.accessKeyId}
          </dd>
        </div>
        <div
          className={clsx(
            'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
            ROW_SPACING,
          )}
        >
          <dt
            className={clsx('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}
          >
            Secret Access Key
          </dt>
          <dd
            className={clsx(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            **********
          </dd>
        </div>
        <div
          className={clsx(
            'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
            ROW_SPACING,
          )}
        >
          <dt
            className={clsx('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}
          >
            Endpoint
          </dt>
          <dd
            className={clsx(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            {typeof userStorageProvision === 'undefined' ? (
              <span className="italic opacity-50">Unknown</span>
            ) : (
              userStorageProvision.endpoint
            )}
          </dd>
        </div>
        <div
          className={clsx(
            'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
            ROW_SPACING,
          )}
        >
          <dt
            className={clsx('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}
          >
            Bucket
          </dt>
          <dd
            className={clsx(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            {typeof userStorageProvision === 'undefined' ? (
              <span className="italic opacity-50">Unknown</span>
            ) : (
              userStorageProvision.bucket
            )}
          </dd>
        </div>
        <div
          className={clsx(
            'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
            ROW_SPACING,
          )}
        >
          <dt
            className={clsx('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}
          >
            Prefix
          </dt>
          <dd
            className={clsx(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            {typeof userStorageProvision === 'undefined' ? (
              <span className="italic opacity-50">Unknown</span>
            ) : (
              userStorageProvision.prefix
            )}
          </dd>
        </div>
        <div
          className={clsx(
            'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
            ROW_SPACING,
          )}
        >
          <dt
            className={clsx('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}
          >
            Region
          </dt>
          <dd
            className={clsx(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            {typeof userStorageProvision === 'undefined' ? (
              <span className="italic opacity-50">Unknown</span>
            ) : (
              userStorageProvision.region
            )}
          </dd>
        </div>
        <div
          className={clsx(
            'sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0',
            ROW_SPACING,
          )}
        >
          <dt
            className={clsx('text-sm font-medium leading-6', LABEL_TEXT_COLOR)}
          >
            Permissions
          </dt>
          <dd
            className={clsx(
              'mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0',
              VALUE_TEXT_COLOR,
            )}
          >
            <div className="flex gap-2">
              {typeof userStorageProvision === 'undefined' ? (
                <span className="italic opacity-50">Unknown</span>
              ) : !userStorageProvision.provisionTypes.length ? (
                <span className="italic opacity-50">None</span>
              ) : (
                userStorageProvision.provisionTypes.map((provisionType, i) => (
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
