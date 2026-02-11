import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { folderTasksListQueryParamsSchema } from './folder-tasks-list-query-params.dto'

export class TasksListQueryParamsDTO extends createZodDto(
  folderTasksListQueryParamsSchema.extend(
    z.object({
      folderId: z.guid().optional(),
    }).shape,
  ),
) {}
