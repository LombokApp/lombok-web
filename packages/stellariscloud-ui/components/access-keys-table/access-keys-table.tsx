import { AccessKeyDTO } from '@stellariscloud/api-client'
import { ArrowPathIcon, KeyIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { Table } from '../../design-system/table/table'
import { Icon } from '../../design-system/icon'
import { ButtonGroup } from '../../design-system/button-group/button-group'

export function AccessKeysTable({
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
    <Table
      headers={['S3 Host & Access Key', 'Folders Count', '']}
      rows={accessKeys.map((accessKey, i) => [
        <div key={i} className="flex flex-col gap-1 p-4">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            <div className="flex flex-col">
              <span className="font-extralight">
                Host:{' '}
                <span className="font-bold">{accessKey.endpointHost}</span>
              </span>
              <div>
                <span
                  className={clsx(
                    'px-2 py-1 mt-1',
                    'inline-flex rounded-md',
                    'bg-yellow-50 dark:bg-yellow-50/20',
                    'font-normal text-xs',
                    'text-yellow-800 dark:text-yellow-300',
                    'ring-1 ring-inset ring-yellow-400/20 dark:ring-yellow-400',
                  )}
                >
                  <div className="flex gap-2 items-center">
                    <Icon
                      icon={KeyIcon}
                      className="dark:text-yellow-300 text-yellow-800"
                      size="sm"
                    />
                    <span className="font-bold">{accessKey.accessKeyId}</span>
                  </div>
                </span>
              </div>
            </div>
          </div>
        </div>,
        <div className="flex flex-col gap-2">{accessKey.folderCount}</div>,
        <div key={i} className="flex gap-2">
          <ButtonGroup
            buttons={[
              {
                name: 'Rotate Access Key',
                icon: ArrowPathIcon,
                onClick: () =>
                  onRotateAccessKey(accessKey.accessKeyId, {
                    accessKeyId: 'testes',
                    secretAccessKey: 'ereree',
                  }),
              },
            ]}
          />
        </div>,
      ])}
    />
  )
}
