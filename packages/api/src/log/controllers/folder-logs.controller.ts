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
import { ApiStandardErrorResponses } from 'src/shared/decorators/api-standard-error-responses.decorator'

import { FolderLogsListQueryParamsDTO } from '../dto/folder-logs-list-query-params.dto'
import type { LogGetResponse } from '../dto/responses/log-get-response.dto'
import type { LogListResponse } from '../dto/responses/log-list-response.dto'
import { LogEntryService } from '../services/log-entry.service'
import { transformLogEntryToDTO } from '../transforms/log-entry.transforms'

@Controller('/api/v1/folders')
@ApiTags('FolderLogs')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
@ApiStandardErrorResponses()
export class FolderLogsController {
  constructor(private readonly logEntryService: LogEntryService) {}

  /**
   * Get a folder log entry by id.
   */
  @Get('/:folderId/logs/:logId')
  async getFolderLog(
    @Req() req: express.Request,
    @Param('folderId') folderId: string,
    @Param('logId') logId: string,
  ): Promise<LogGetResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    return {
      log: transformLogEntryToDTO(
        await this.logEntryService.getFolderLogAsUser(req.user, {
          folderId,
          logId,
        }),
      ),
    }
  }

  /**
   * List folder log entries.
   */
  @Get('/:folderId/logs')
  async listFolderLogs(
    @Req() req: express.Request,
    @Query() queryParams: FolderLogsListQueryParamsDTO,
    @Param('folderId') folderId: string,
  ): Promise<LogListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const { result, meta } = await this.logEntryService.listFolderLogsAsUser(
      req.user,
      { folderId },
      {
        ...queryParams,
        sort: normalizeSortParam(queryParams.sort),
      },
    )
    return {
      result: result.map((logEntry) => transformLogEntryToDTO(logEntry)),
      meta,
    }
  }
}
