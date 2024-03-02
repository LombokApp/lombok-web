import { singleton } from 'tsyringe'

import type { QueueName } from '../../../constants/app-worker-constants'
import type { QueueProcessorFunc } from '../../../util/queue.util'
import { QueueProcessor } from '../../../util/queue.util'
import { EventService } from '../services/event.service'

@singleton()
export class NotifyPendingEventsProcessor extends QueueProcessor<QueueName.NotifyPendingEvents> {
  constructor(private readonly eventService: EventService) {
    super()
  }

  run: QueueProcessorFunc<QueueName.NotifyPendingEvents> = (_job) => {
    return this.eventService.notifyPendingEvents()
  }
}
