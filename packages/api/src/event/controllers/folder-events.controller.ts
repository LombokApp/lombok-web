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

import { FolderEventsListQueryParamsDTO } from '../dto/folder-events-list-query-params.dto'
import type { EventGetResponse } from '../dto/responses/event-get-response.dto'
import type { EventListResponse } from '../dto/responses/event-list-response.dto'
import { EventService } from '../services/event.service'
import { transformEventToDTO } from '../transforms/event.transforms'

@Controller('/api/v1/folders')
@ApiTags('FolderEvents')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
export class FolderEventsController {
  constructor(private readonly eventService: EventService) {}

  /**
   * Get a folder event by id.
   */
  @Get('/:folderId/events/:eventId')
  async getFolderEvent(
    @Req() req: express.Request,
    @Param('folderId') folderId: string,
    @Param('eventId') eventId: string,
  ): Promise<EventGetResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    return {
      event: transformEventToDTO(
        await this.eventService.getFolderEventAsUser(req.user, {
          folderId,
          eventId,
        }),
      ),
    }
  }

  /**
   * List tasks.
   */
  @Get('/:folderId/events')
  async listFolderEvents(
    @Req() req: express.Request,
    @Query() queryParams: FolderEventsListQueryParamsDTO,
    @Param('folderId') folderId: string,
  ): Promise<EventListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const { result, meta } = await this.eventService.listFolderEventsAsUser(
      req.user,
      { folderId },
      queryParams,
    )
    return {
      result: result.map((event) => transformEventToDTO(event)),
      meta,
    }
  }
}
