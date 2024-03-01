import { forwardRef, Module } from '@nestjs/common'
import { AppModule } from 'src/app/app.module'

import { EventController } from './controllers/event.controller'
import { EventService } from './services/event.service'

@Module({
  imports: [forwardRef(() => AppModule)],
  controllers: [EventController],
  providers: [EventService],
  exports: [EventService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class EventModule {}
