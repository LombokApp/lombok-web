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

import { LogEntriesListQueryParamsDTO } from '../dto/log-entries-list-query-params.dto'
import { LogEntryGetResponse } from '../dto/responses/log-entry-get-response.dto'
import { LogEntryListResponse } from '../dto/responses/log-entry-list-response.dto'
import { LogEntryService } from '../log-entry.service'
import { transformLogEntryToDTO } from '../transforms/event.transforms'

@Controller('/api/v1/log-entries')
@ApiTags('LogEntries')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
export class LogEntriesController {
  constructor(private readonly logEntryService: LogEntryService) {}

  /**
   * Get an event by id.
   */
  @Get('/:logEntryId')
  async getLogEntry(
    @Req() req: express.Request,
    @Param() eventId: string,
  ): Promise<LogEntryGetResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    return {
      event: transformLogEntryToDTO(
        await this.logEntryService.getLogEntryAsAdmin(req.user, eventId),
      ),
    }
  }

  /**
   * List events.
   */
  @Get()
  async listLogEntries(
    @Req() req: express.Request,
    @Query() queryParams: LogEntriesListQueryParamsDTO,
  ): Promise<LogEntryListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const { result, meta } = await this.logEntryService.listLogEntriesAsAdmin(
      req.user,
      queryParams,
    )
    return {
      result: result.map((logEntry) => transformLogEntryToDTO(logEntry)),
      meta,
    }
  }
}
