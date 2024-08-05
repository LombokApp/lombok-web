import { StorageProvisionDTO } from '@stellariscloud/api-client'
import { Table } from '../../design-system/table/table'
import clsx from 'clsx'
import { Icon } from '../../design-system/icon'
import {
  GlobeAltIcon,
  KeyIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { ButtonGroup } from '../../design-system/button-group/button-group'

export function StorageProvisionsTable({
  storageProvisions,
  onEdit,
  onDelete,
}: {
  storageProvisions: StorageProvisionDTO[]
  onEdit: (l: StorageProvisionDTO) => void
  onDelete: (l: StorageProvisionDTO) => void
}) {
  return (
    <Table
      headers={['Server', 'Provision Types', 'Actions']}
      rows={storageProvisions.map((storageProvision, i) => [
        <div key={i} className="flex flex-col gap-1 p-4">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            <div className="flex flex-col">
              {storageProvision.label}
              <span className="font-semibold text-sm font-extralight">
                {storageProvision.endpoint}/{storageProvision.bucket}/
                {storageProvision.prefix}/
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            <span
              className={clsx(
                'px-2 py-1',
                'inline-flex rounded-md',
                'bg-yellow-50 dark:bg-yellow-50/20',
                'font-normal text-xs',
                'text-yellow-800 dark:text-yellow-300',
                'ring-1 ring-inset ring-yellow-600/20 dark:ring-yellow-600/50',
              )}
            >
              <div className="flex gap-2 items-center">
                <Icon
                  icon={KeyIcon}
                  className="dark:text-yellow-300 text-yellow-800"
                  size="sm"
                />
                <span>{storageProvision.accessKeyId}</span>
              </div>
            </span>
            <span
              className={clsx(
                'px-2 py-1',
                'inline-flex rounded-md',
                'bg-green-50 dark:bg-green-50/10',
                'font-medium text-xs',
                'text-green-700 dark:text-green-400',
                'ring-1 ring-inset ring-green-600/20',
              )}
            >
              <div className="flex gap-2 items-center">
                <Icon
                  icon={GlobeAltIcon}
                  className="text-green-700 dark:text-green-400"
                  size="sm"
                />
                <span>{storageProvision.region}</span>
              </div>
            </span>
          </div>
        </div>,
        <div className="flex flex-col gap-2">
          {storageProvision.provisionTypes.map((provisionType) => (
            <div key={provisionType}>
              <span
                className={clsx(
                  'px-2 py-1',
                  'inline-flex rounded-md',
                  'bg-blue-50 dark:bg-blue-50/20',
                  'font-normal text-xs',
                  'text-blue-800 dark:text-blue-300',
                  'ring-1 ring-inset ring-blue-600/20 dark:ring-blue-300/50',
                )}
              >
                <div className="flex gap-2 items-center">
                  <span>{provisionType}</span>
                </div>
              </span>
            </div>
          ))}
        </div>,
        <div key={i} className="flex gap-2">
          <ButtonGroup
            buttons={[
              {
                name: '',
                icon: PencilSquareIcon,
                onClick: () => onEdit(storageProvision),
              },
              {
                name: '',
                icon: TrashIcon,
                onClick: () => onDelete(storageProvision),
              },
            ]}
          />
        </div>,
      ])}
    />
  )
}
