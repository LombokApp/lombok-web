import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { folderTasksListQueryParamsSchema } from './folder-tasks-list-query-params.dto'

export class TasksListQueryParamsDTO extends createZodDto(
  folderTasksListQueryParamsSchema.merge(
    z.object({
      folderId: z.string().uuid().optional(),
    }),
  ),
) {}
