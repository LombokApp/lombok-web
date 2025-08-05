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

import { LogsListQueryParamsDTO } from '../dto/logs-list-query-params.dto'
import { LogGetResponse } from '../dto/responses/log-get-response.dto'
import { LogListResponse } from '../dto/responses/log-list-response.dto'
import { LogEntryService } from '../services/log-entry.service'
import { transformLogEntryToDTO } from '../transforms/log-entry.transforms'

@Controller('/api/v1/server/logs')
@ApiTags('ServerLogs')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
export class ServerLogsController {
  constructor(private readonly logEntryService: LogEntryService) {}

  /**
   * Get a log entry by id.
   */
  @Get('/:logId')
  async getLog(
    @Req() req: express.Request,
    @Param('logId') logId: string,
  ): Promise<LogGetResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    return {
      log: transformLogEntryToDTO(
        await this.logEntryService.getLogAsAdmin(req.user, logId),
      ),
    }
  }

  /**
   * List log entries.
   */
  @Get()
  async listLogs(
    @Req() req: express.Request,
    @Query() queryParams: LogsListQueryParamsDTO,
  ): Promise<LogListResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    const { result, meta } = await this.logEntryService.listLogsAsAdmin(
      req.user,
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
