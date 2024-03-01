import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common'
import { isNull, sql } from 'drizzle-orm'
import { AppService } from 'src/app/services/app.service'
import { OrmService } from 'src/orm/orm.service'
import { v4 as uuidV4 } from 'uuid'

import type { EventDTO } from '../dto/event.dto'
import { eventsTable } from '../entities/event.entity'
import type { NewEventReceipt } from '../entities/event-receipt.entity'
import { eventReceiptsTable } from '../entities/event-receipt.entity'

@Injectable()
export class EventService {
  constructor(
    @Inject(forwardRef(() => AppService))
    private readonly appService: AppService,
    private readonly ormService: OrmService,
  ) {}

  async emitEvent({
    appIdentifier,
    eventKey,
    data,
  }: {
    appIdentifier: string // id of the inserting module
    eventKey: string
    data: any
  }) {
    const now = new Date()

    // check this module can emit this event
    const actorModule = await this.appService.getModule(appIdentifier)
    if (!actorModule?.emitEvents.includes(eventKey)) {
      throw new HttpException('ForbiddenEmitEvent', HttpStatus.FORBIDDEN)
    }

    await this.ormService.db.transaction(async (db) => {
      const [event] = await db
        .insert(eventsTable)
        .values([
          { id: uuidV4(), eventKey, createdAt: now, updatedAt: now, data },
        ])
        .returning()
      const eventReceipts: NewEventReceipt[] = await this.appService
        .listApps()
        .then((modules) =>
          modules
            .filter((m) => m.config.subscribedEvents.includes(eventKey))
            .map((m) => ({
              appIdentifier: m.identifier,
              eventKey: event.eventKey,
              id: uuidV4(),
              createdAt: now,
              updatedAt: now,
              eventId: event.id,
            })),
        )
      await db.insert(eventReceiptsTable).values(eventReceipts)
    })
  }

  async notifyPendingEvents() {
    const pendingEventReceipts = await this.ormService.db
      .select({
        eventKey: eventReceiptsTable.eventKey,
        appIdentifier: eventReceiptsTable.appIdentifier,
        count: sql<number>`cast(count(${eventReceiptsTable.id}) as int)`,
      })
      .from(eventReceiptsTable)
      .where(isNull(eventReceiptsTable.startedAt))
      .groupBy(eventReceiptsTable.eventKey, eventReceiptsTable.appIdentifier)

    const pendingEventsByModule = pendingEventReceipts.reduce<{
      [moduleId: string]: { [key: string]: number }
    }>(
      (acc, next) => ({
        ...acc,
        [next.appIdentifier]: {
          ...(next.appIdentifier in acc ? acc[next.appIdentifier] : {}),
          [next.eventKey]: next.count,
        },
      }),
      {},
    )

    for (const moduleId of Object.keys(pendingEventsByModule)) {
      for (const eventKey of Object.keys(pendingEventsByModule[moduleId])) {
        // Object.keys(pendingEventsByModule[moduleId]).map(moduleId)
        this.appService.broadcastEventsPending(
          moduleId,
          eventKey,
          pendingEventsByModule[moduleId][eventKey],
        )
      }
    }
  }

  getEvent(eventId: string): EventDTO {
    return {
      id: eventId,
      eventKey: '__dummy_event_key__',
    }
  }
}
