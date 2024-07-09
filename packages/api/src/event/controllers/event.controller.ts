import { ZodValidationPipe } from '@anatine/zod-nestjs'
import { Controller, Get, Param, UseGuards, UsePipes } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import {
  AllowedActor,
  AuthGuardConfig,
} from 'src/auth/guards/auth.guard-config'

import { EventDTO } from '../dto/event.dto'
import { EventService } from '../services/event.service'

@Controller('/events')
@ApiTags('Event')
@UseGuards(AuthGuard)
@UsePipes(ZodValidationPipe)
export class EventController {
  constructor(private readonly eventService: EventService) {}

  /**
   * Get an event by id.
   */
  @Get('/:eventId')
  @AuthGuardConfig({ allowedActors: [AllowedActor.USER] })
  getAppInfo(@Param() eventId: string): Promise<EventDTO> {
    return this.eventService.getEvent(eventId)
  }
}
