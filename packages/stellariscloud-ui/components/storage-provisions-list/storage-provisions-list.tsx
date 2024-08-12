import { StorageProvisionDTO } from '@stellariscloud/api-client'
import { Table } from '../../design-system/table/table'
import clsx from 'clsx'
import { Icon } from '../../design-system/icon'
import {
  ChevronRightIcon,
  GlobeAltIcon,
  KeyIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { ButtonGroup } from '../../design-system/button-group/button-group'
import { StackedList } from '../../design-system/stacked-list/stacked-list'
import { Badge } from '../../design-system/badge/badge'
import Link from 'next/link'

export function StorageProvisionsList({
  storageProvisions,
  onEdit,
  onDelete,
}: {
  storageProvisions: StorageProvisionDTO[]
  onEdit: (l: StorageProvisionDTO) => void
  onDelete: (l: StorageProvisionDTO) => void
}) {
  return (
    <StackedList
      items={storageProvisions.map((storageProvision, i) => (
        <Link
          className="w-full"
          href={`/server/storage/provisions/${storageProvision.id}`}
        >
          <div className="flex justify-between flex-1 items-center gap-x-4 p-4 py-2">
            <div className="min-w-0 flex-auto">
              <p className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
                {storageProvision.label}{' '}
                <span className="whitespace-nowrap font-light text-xs">
                  - Key ID: {storageProvision.accessKeyId}
                </span>
              </p>
              <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-500 dark:text-gray-100">
                <p className="truncate">{storageProvision.endpoint}</p>
                <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
                  <circle r={1} cx={1} cy={1} />
                </svg>
                <p className="truncate">
                  bucket{' '}
                  <span className="italic">{storageProvision.bucket}</span>
                </p>
                <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
                  <circle r={1} cx={1} cy={1} />
                </svg>
                <p className="truncate">
                  prefix:{' '}
                  <span className="italic">{storageProvision.prefix}</span>
                </p>
              </div>
              <div className="mt-1 flex items-center gap-x-1 text-xs leading-5 text-gray-500">
                {storageProvision.provisionTypes.map((provisionType) => (
                  <div key={provisionType}>
                    <Badge>
                      <span>{provisionType}</span>
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            <div key={i} className="flex gap-2">
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
