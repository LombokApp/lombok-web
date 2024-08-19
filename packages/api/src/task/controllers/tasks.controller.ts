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
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { AuthGuard } from 'src/auth/guards/auth.guard'

import type { TaskGetResponse } from '../dto/responses/task-get-response.dto'
import type { TaskListResponse } from '../dto/responses/task-list-response.dto'
import { TaskDTO } from '../dto/task.dto'
import { TasksListQueryParamsDTO } from '../dto/tasks-list-query-params.dto'
import { TaskService } from '../services/task.service'
import { transformTaskToDTO } from '../transforms/task.transforms'

@Controller('/api/v1')
@ApiTags('Tasks')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
@ApiExtraModels(TaskDTO)
export class TasksController {
  constructor(private readonly taskService: TaskService) {}

  /**
   * Get a folder task by id.
   */
  @Get('/:folderId/tasks/:taskId')
  async getTask(
    @Req() req: express.Request,
    @Param('folderId') folderId: string,
    @Param('taskId') taskId: string,
  ): Promise<TaskGetResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    return {
      task: transformTaskToDTO(
        await this.taskService.getTaskAsUser(req.user, { folderId, taskId }),
      ),
    }
  }

  /**
   * List tasks.
   */
  @Get('/:folderId/tasks')
  async listTasks(
    @Req() req: express.Request,
    @Query() queryParams: TasksListQueryParamsDTO,
    @Param('folderId') folderId: string,
  ): Promise<TaskListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const { result, meta } = await this.taskService.listTasksAsUser(
      req.user,
      { folderId },
      queryParams,
    )
    return {
      result: result.map((task) => transformTaskToDTO(task)),
      meta,
    }
  }
}
