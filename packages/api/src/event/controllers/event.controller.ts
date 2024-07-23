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

import { EventDTO } from '../dto/event.dto'
import { EventGetResponse } from '../dto/responses/event-get-response.dto'
import { EventListResponse } from '../dto/responses/event-list-response.dto'
import { EventsListQueryParamsDTO } from '../dto/events-list-query-params.dto'
import { EventService } from '../services/event.service'
import { transformEventToDTO } from '../transforms/event.transforms'

@Controller('/api/v1/events')
@ApiTags('Events')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
@ApiExtraModels(EventDTO)
export class EventController {
  constructor(private readonly eventService: EventService) {}

  /**
   * Get an event by id.
   */
  @Get('/:eventId')
  async getEvent(
    @Req() req: express.Request,
    @Param() eventId: string,
  ): Promise<EventGetResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    return {
      event: transformEventToDTO(
        await this.eventService.getEventAsAdmin(req.user, eventId),
      ),
    }
  }

  /**
   * List events.
   */
  @Get()
  async listEvents(
    @Req() req: express.Request,
    @Query() queryParams: EventsListQueryParamsDTO,
  ): Promise<EventListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const { result, meta } = await this.eventService.listEventsAsAdmin(
      req.user,
      queryParams,
    )
    return {
      result: result.map((event) => transformEventToDTO(event)),
      meta,
    }
  }
}
