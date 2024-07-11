import { ZodValidationPipe } from '@anatine/zod-nestjs'
import { Controller, Get, Param, UseGuards, UsePipes } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from 'src/auth/guards/auth.guard'

import { EventGetResponse } from '../dto/responses/event-get-response.dto'
import { EventService } from '../services/event.service'
import { transformEventToDTO } from '../transforms/event.transforms'

@Controller('/events')
@ApiTags('Events')
@UseGuards(AuthGuard)
@UsePipes(ZodValidationPipe)
export class EventController {
  constructor(private readonly eventService: EventService) {}

  /**
   * Get an event by id.
   */
  @Get('/:eventId')
  async getEvent(@Param() eventId: string): Promise<EventGetResponse> {
    return {
      event: transformEventToDTO(await this.eventService.getEvent(eventId)),
    }
  }
}
