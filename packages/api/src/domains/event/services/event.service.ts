import { Lifecycle, scoped } from 'tsyringe'
import { v4 as uuidV4 } from 'uuid'

import { OrmService } from '../../../orm/orm.service'
import { ModuleService } from '../../module/services/module.service'
import { eventsTable } from '../entities/event.entity'
import type { NewEventReceipt } from '../entities/event-receipt.entity'
import { eventReceiptsTable } from '../entities/event-receipt.entity'
import { ForbiddenEmitEvent } from '../errors/event.error'

@scoped(Lifecycle.ContainerScoped)
export class EventService {
  constructor(
    private readonly ormService: OrmService,
    private readonly moduleService: ModuleService,
  ) {}

  async emitEvent({
    moduleId,
    eventKey,
  }: {
    moduleId: string // id of the inserting module
    eventKey: string
    data: any
  }) {
    const now = new Date()

    // check this module can emit this event
    const actorModule = await this.moduleService.getModule(moduleId)
    if (!actorModule?.config.emitEvents.includes(eventKey)) {
      throw new ForbiddenEmitEvent()
    }

    await this.ormService.db.transaction(async (db) => {
      const [event] = await db
        .insert(eventsTable)
        .values([{ id: uuidV4(), eventKey, createdAt: now, updatedAt: now }])
        .returning()
      const eventReceipts: NewEventReceipt[] = await this.moduleService
        .listModules()
        .then((modules) =>
          modules
            .filter(
              (m) => m.enabled && m.config.subscribedEvents.includes(eventKey),
            )
            .map((m) => ({
              moduleId: m.id,
              eventKey: event.eventKey,
              id: uuidV4(),
              createdAt: now,
              updatedAt: now,
              eventId: event.id,
              // handlerId: '',
              // startedAt: '',
              // completedAt: '',
            })),
        )
      await db.insert(eventReceiptsTable).values(eventReceipts)
    })
  }
}
