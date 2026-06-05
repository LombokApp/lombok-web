import { CORE_IDENTIFIER, CoreEvent } from '@lombokapp/types'
import { describe, expect, it } from 'bun:test'

import type { Event } from '../../event/entities/event.entity'
import type { OrmService } from '../../orm/orm.service'
import { NotificationBatchingService } from './notification-batching.service'

const AGG_KEY = `core:${CoreEvent.object_added}:folder-1:`

const makeEvent = (createdAt: Date): Event => ({
  id: 'event-id',
  eventIdentifier: CoreEvent.object_added,
  emitterId: CORE_IDENTIFIER,
  aggregationHandledAt: null,
  aggregationKey: AGG_KEY,
  targetUserId: null,
  actorUserId: null,
  targetLocationFolderId: 'folder-1',
  targetLocationObjectKey: 'file.txt',
  data: {},
  createdAt,
})

// Minimal stub of the drizzle chain used by shouldFlushEvents:
//   db.select().from(table).where(cond) -> Promise<Event[]>
const makeService = (events: Event[]) => {
  const db = {
    select: () => ({
      from: () => ({
        where: () => Promise.resolve(events),
      }),
    }),
  }
  return new NotificationBatchingService({ db } as unknown as OrmService)
}

const eventMeta = {
  eventIdentifier: CoreEvent.object_added,
  emitterIdentifier: CORE_IDENTIFIER,
}

describe('NotificationBatchingService.shouldFlushEvents', () => {
  it('flushes once the debounce window has gone quiet', async () => {
    const service = makeService([makeEvent(new Date(Date.now() - 6000))])

    const decision = await service.shouldFlushEvents(AGG_KEY, eventMeta)

    expect(decision.shouldFlush).toBe(true)
  })

  it('requeues while events are still arriving within the debounce window', async () => {
    const service = makeService([makeEvent(new Date(Date.now() - 1000))])

    const decision = await service.shouldFlushEvents(AGG_KEY, eventMeta)

    expect(decision.shouldFlush).toBe(false)
    expect(decision.requeueDelayMs).toBeGreaterThanOrEqual(1000)
  })

  it('flushes instead of requeuing when an event timestamp is in the future (clock anomaly)', async () => {
    // Simulates a container clock that ran ahead when the event was written
    // and was then stepped back: createdAt is ahead of now.
    const service = makeService([makeEvent(new Date(Date.now() + 120_000))])

    const decision = await service.shouldFlushEvents(AGG_KEY, eventMeta)

    expect(decision.shouldFlush).toBe(true)
    expect(decision.requeueDelayMs).toBeUndefined()
  })

  it('force-flushes once the requeue ceiling is exceeded', async () => {
    // Event is genuinely recent (would normally requeue), but the requeue
    // count has blown past maxIntervalSeconds (60) + headroom.
    const service = makeService([makeEvent(new Date(Date.now() - 500))])

    const decision = await service.shouldFlushEvents(AGG_KEY, {
      ...eventMeta,
      requeueCount: 100,
    })

    expect(decision.shouldFlush).toBe(true)
    expect(decision.requeueDelayMs).toBeUndefined()
  })

  it('still requeues when below the requeue ceiling', async () => {
    const service = makeService([makeEvent(new Date(Date.now() - 500))])

    const decision = await service.shouldFlushEvents(AGG_KEY, {
      ...eventMeta,
      requeueCount: 3,
    })

    expect(decision.shouldFlush).toBe(false)
    expect(decision.requeueDelayMs).toBeGreaterThanOrEqual(1000)
  })
})
