import type { FolderGetResponse } from '@stellariscloud/api-client'
import {
  Card,
  CardContent,
  CardHeader,
  TypographyH3,
} from '@stellariscloud/ui-toolkit'
import { ListChecks } from 'lucide-react'
import { Link } from 'react-router-dom'

import { TasksList } from '../../components/tasks-list/tasks-list.component'
import { Icon } from '../../design-system/icon'
import { useFolderContext } from '../../pages/folders/folder.context'
import { tasksApiHooks } from '../../services/api'

export const FolderTasksList = ({
  folderAndPermission,
}: {
  folderAndPermission?: FolderGetResponse
}) => {
  const { folder } = folderAndPermission ?? {}
  const { folderId } = useFolderContext()
  const listFolderTasksQuery = tasksApiHooks.useListFolderTasks(
    {
      folderId,
    },
    {},
  )

  return (
    <Card>
      <CardHeader className="p-4 pb-1 pt-3">
        <div className="flex flex-col">
          <TypographyH3>
            <div className="flex items-center gap-2">
              <Icon icon={ListChecks} size="md" />
              Tasks
            </div>
          </TypographyH3>
          <Link
            className="text-xs italic underline opacity-50"
            to={`/folders/${folder?.id}/tasks`}
          >
            view all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {listFolderTasksQuery.data && (
          <TasksList tasks={listFolderTasksQuery.data.result} />
        )}
      </CardContent>
    </Card>
  )
}
