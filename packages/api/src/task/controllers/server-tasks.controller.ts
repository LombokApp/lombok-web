import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { normalizeSortParam } from 'src/core/utils/sort.util'

import { TaskGetResponse } from '../dto/responses/task-get-response.dto'
import { TaskListResponse } from '../dto/responses/task-list-response.dto'
import { TasksListQueryParamsDTO } from '../dto/tasks-list-query-params.dto'
import { TaskService } from '../services/task.service'
import { transformTaskToDTO } from '../transforms/task.transforms'

@Controller('/api/v1/server/tasks')
@ApiTags('ServerTasks')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
export class ServerTasksController {
  constructor(private readonly taskService: TaskService) {}

  /**
   * Get a task by id.
   */
  @Get('/:taskId')
  async getTask(
    @Req() req: express.Request,
    @Param('taskId') taskId: string,
  ): Promise<TaskGetResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    return {
      task: transformTaskToDTO(
        await this.taskService.getTaskAsAdmin(req.user, taskId),
      ),
    }
  }

  /**
   * List tasks.
   */
  @Get()
  async listTasks(
    @Req() req: express.Request,
    @Query() queryParams: TasksListQueryParamsDTO,
  ): Promise<TaskListResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    const { result, meta } = await this.taskService.listTasksAsAdmin(req.user, {
      ...queryParams,
      sort: normalizeSortParam(queryParams.sort),
    })
    return {
      result: result.map((task) => transformTaskToDTO(task)),
      meta,
    }
  }
}
