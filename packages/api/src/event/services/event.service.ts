import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { eq, isNull, sql } from 'drizzle-orm'
import { AppService } from 'src/app/services/app.service'
import { OrmService } from 'src/orm/orm.service'
import { QueueName } from 'src/queue/queue.constants'
import { QueueService } from 'src/queue/queue.service'
import { User } from 'src/users/entities/user.entity'
import { v4 as uuidV4 } from 'uuid'

import type { EventDTO } from '../dto/event.dto'
import { Event, eventsTable } from '../entities/event.entity'
import type { NewEventReceipt } from '../entities/event-receipt.entity'
import { eventReceiptsTable } from '../entities/event-receipt.entity'

@Injectable()
export class EventService {
  constructor(
    private readonly ormService: OrmService,
    private readonly queueService: QueueService,
    private readonly appService: AppService,
  ) {}

  async emitEvent({
    appIdentifier,
    eventKey,
    data,
  }: {
    appIdentifier: string // id of the inserting app
    eventKey: string
    data: any
  }) {
    const now = new Date()

    // check this app can emit this event
    const actorApp = await this.appService.getApp(appIdentifier)

    // console.log('emitEvent:', {
    //   eventKey,
    //   appIdentifier,
    //   data,
    //   authorized: actorApp?.emitEvents.includes(eventKey),
    // })

    if (!actorApp?.emitEvents.includes(eventKey)) {
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
        .getApps()
        .then((apps) =>
          Object.keys(apps)
            .filter((_appIdentifier) =>
              apps[_appIdentifier]?.config.subscribedEvents.includes(eventKey),
            )
            .map((_appIdentifier) => ({
              appIdentifier: _appIdentifier,
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

  async notifyAllAppsOfPendingEvents() {
    const pendingEventReceipts = await this.ormService.db
      .select({
        eventKey: eventReceiptsTable.eventKey,
        appIdentifier: eventReceiptsTable.appIdentifier,
        count: sql<number>`cast(count(${eventReceiptsTable.id}) as int)`,
      })
      .from(eventReceiptsTable)
      .where(isNull(eventReceiptsTable.startedAt))
      .groupBy(eventReceiptsTable.eventKey, eventReceiptsTable.appIdentifier)

    const pendingEventsByApp = pendingEventReceipts.reduce<{
      [appId: string]: { [key: string]: number }
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

    for (const appId of Object.keys(pendingEventsByApp)) {
      for (const eventKey of Object.keys(pendingEventsByApp[appId])) {
        const jobPayload = {
          appId,
          eventKey,
          eventCount: pendingEventsByApp[appId][eventKey],
        }
        await this.queueService.addJob(
          QueueName.NotifyAppOfPendingEvents,
          jobPayload,
        )
      }
    }
  }

  async getEventAsAdmin(actor: User, eventId: string): Promise<Event> {
    const event = await this.ormService.db.query.eventsTable.findFirst({
      where: eq(eventsTable.id, eventId),
    })
    if (!event) {
      throw new NotFoundException()
    }
    return event
  }

  async listEventsAsAdmin(
    actor: User,
    {
      offset,
      limit,
    }: {
      offset?: number
      limit?: number
    },
  ): Promise<{ meta: { totalCount: number }; result: EventDTO[] }> {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    const events: Event[] = await this.ormService.db.query.eventsTable.findMany(
      {
        offset: offset ?? 0,
        limit: limit ?? 25,
      },
    )
    const [eventsCount] = await this.ormService.db
      .select({ count: sql<string | null>`count(*)` })
      .from(eventsTable)

    return {
      result: events,
      meta: { totalCount: parseInt(eventsCount.count ?? '0', 10) },
    }
  }
}
