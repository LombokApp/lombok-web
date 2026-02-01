import { CORE_IDENTIFIER, CoreEvent } from '@lombokapp/types'
import { Injectable } from '@nestjs/common'
import { and, eq, isNull } from 'drizzle-orm'
import { type Event, eventsTable } from 'src/event/entities/event.entity'
import { OrmService } from 'src/orm/orm.service'

import { getCoreEventAggregationConfig } from '../config/notification-batching.config'

export interface BatchingDecision {
  shouldFlush: boolean
  requeueDelayMs?: number
}

@Injectable()
export class NotificationBatchingService {
  constructor(private readonly ormService: OrmService) {}

  /**
   * Determines if events should be flushed based on batching configuration.
   * Returns decision with whether to flush and optional requeue delay.
   */
  async shouldFlushEvents(
    aggregationKey: string,
    {
      emitterIdentifier,
      eventIdentifier,
    }: {
      eventIdentifier: string
      emitterIdentifier: string
    },
  ): Promise<BatchingDecision> {
    const config =
      emitterIdentifier === CORE_IDENTIFIER
        ? getCoreEventAggregationConfig(eventIdentifier as CoreEvent)
        : ({ notificationsEnabled: false } as const) // TODO: implement non-core event notifications

    // If notifications disabled, don't flush
    if (!config?.notificationsEnabled) {
      return { shouldFlush: false }
    }

    // Get unhandled events for this aggregation key
    const unhandledEvents = await this.ormService.db
      .select()
      .from(eventsTable)
      .where(
        and(
          eq(eventsTable.aggregationKey, aggregationKey),
          isNull(eventsTable.aggregationHandledAt),
        ),
      )

    if (unhandledEvents.length === 0) {
      return { shouldFlush: false }
    }

    const now = new Date()

    // Calculate timestamps
    const timestamps = unhandledEvents.map((e) => e.createdAt.getTime())
    const lastUnhandledAt = new Date(Math.max(...timestamps))
    const firstUnhandledAt = new Date(Math.min(...timestamps))

    // If debounceSeconds is 0, flush immediately
    if (config.debounceSeconds === 0) {
      return { shouldFlush: true }
    }

    // Check debounce: quietFor = now - lastUnhandledAt
    const quietForMs = now.getTime() - lastUnhandledAt.getTime()
    const debounceMs = config.debounceSeconds * 1000

    if (quietForMs < debounceMs) {
      // Not quiet long enough, requeue
      const requeueDelayMs = debounceMs - quietForMs
      return {
        shouldFlush: false,
        requeueDelayMs: Math.max(1000, requeueDelayMs), // At least 1 second
      }
    }

    // Check maxIntervalSeconds if set
    if (config.maxIntervalSeconds) {
      const ageMs = now.getTime() - firstUnhandledAt.getTime()
      const maxIntervalMs = config.maxIntervalSeconds * 1000

      if (ageMs >= maxIntervalMs) {
        // Max interval reached, flush regardless of debounce
        return { shouldFlush: true }
      }
    }

    // Debounce satisfied
    return { shouldFlush: true }
  }

  /**
   * Gets all unhandled events for an aggregation key.
   */
  async getUnhandledEvents(aggregationKey: string): Promise<Event[]> {
    return this.ormService.db
      .select()
      .from(eventsTable)
      .where(
        and(
          eq(eventsTable.aggregationKey, aggregationKey),
          isNull(eventsTable.aggregationHandledAt),
        ),
      )
  }
}
