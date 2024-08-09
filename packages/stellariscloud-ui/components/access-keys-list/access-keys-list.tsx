import { AccessKeyDTO } from '@stellariscloud/api-client'
import { ArrowPathIcon, KeyIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { Table } from '../../design-system/table/table'
import { Icon } from '../../design-system/icon'
import { ButtonGroup } from '../../design-system/button-group/button-group'
import { randomCharacters } from '@stellariscloud/utils'
import { StackedList } from '../../design-system/stacked-list/stacked-list'
import { Badge } from '../../design-system/badge/badge'

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
        <div className="flex w-full justify-between">
          <div key={i} className="flex flex-col gap-1 p-4">
            <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              <div className="flex gap-1">
                <span className="font-extralight">
                  Access Key ID:{' '}
                  <span className="font-bold">{accessKey.accessKeyId}</span>
                </span>
              </div>
              <div className="flex gap-2">
                <Badge>{accessKey.endpointHost}</Badge>
                <Badge>{accessKey.folderCount} Folders</Badge>
              </div>
            </div>
          </div>
          <div key={i} className="flex gap-2">
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
        </div>
      ))}
    />
  )
}
