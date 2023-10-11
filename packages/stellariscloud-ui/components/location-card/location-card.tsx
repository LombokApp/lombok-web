import { PencilSquareIcon } from '@heroicons/react/24/outline'
import type { ServerLocationData } from '@stellariscloud/api-client'
import clsx from 'clsx'

import { Icon } from '../../design-system/icon'

export function LocationCard({
  location,
  onSelect,
  selected,
  selectable = false,
  showEdit = false,
  onEdit,
}: {
  location: ServerLocationData
  onSelect?: (location: ServerLocationData) => void
  selected: boolean
  selectable?: boolean
  showEdit?: boolean
  onEdit?: () => void
}) {
  return (
    <div
      key={location.id}
      className={clsx(
        'border border-gray-400 p-6 rounded-lg dark:text-gray-200 dark:text-gray-500',
        selected && 'bg-blue-500',
        'min-w-[5rem]',
        'relative',
      )}
    >
      <div className="flex gap-4 items-start">
        {selectable && (
          <div>
            <input
              type="checkbox"
              className="rounded-sm"
              onChange={() => onSelect?.(location)}
              checked={selected}
            />
            {selectable}
          </div>
        )}
        <div>
          <div>{location.name}</div>
          <div>
            {location.endpoint.endsWith('/')
              ? location.endpoint
              : `${location.endpoint}/`}
          </div>
          <div>{location.bucket}</div>
        </div>
      </div>
      {showEdit && (
        <div className="absolute top-3 right-3 w-5 h-5">
          <div
            onKeyDown={() => undefined}
            role="button"
            tabIndex={0}
            onClick={onEdit}
          >
            <Icon
              className={'text-gray-500 dark:text-gray-700'}
              icon={PencilSquareIcon}
            />
          </div>
        </div>
      )}
    </div>
  )
}
