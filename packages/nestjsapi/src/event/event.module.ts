import { Module } from '@nestjs/common'

import { EventController } from './controllers/event.controller'
import { EventService } from './services/event.service'

@Module({
  controllers: [EventController],
  providers: [EventService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class EventModule {}
