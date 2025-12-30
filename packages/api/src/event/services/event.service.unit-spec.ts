import type { JsonSerializableObject } from '@lombokapp/types'
import { describe, expect, it } from 'bun:test'

import type { Event } from '../entities/event.entity'
import { parseDataFromEventWithTrigger } from './event-template.util'

const baseEvent: Event = {
  id: 'event-id',
  eventIdentifier: 'platform:worker_task_enqueued',
  emitterIdentifier: 'platform',
  targetUserId: null,
  targetLocationFolderId: null,
  targetLocationObjectKey: null,
  data: {
    innerTaskId: 'abc-123',
    appIdentifier: 'demo-app',
    workerIdentifier: 'worker-1',
    nested: { value: 'nested' },
  } as JsonSerializableObject,
  createdAt: new Date(),
}

describe('parseDataFromEventWithTrigger', () => {
  it('interpolates full-string template expressions from event data', async () => {
    const parsed = await parseDataFromEventWithTrigger(
      {
        innerTaskId: '{{ event.data.innerTaskId }}',
        appIdentifier: '{{event.data.appIdentifier}}',
        workerIdentifier: '{{ event.data.workerIdentifier }}',
      },
      baseEvent,
    )

    expect(parsed).toEqual({
      innerTaskId: 'abc-123',
      appIdentifier: 'demo-app',
      workerIdentifier: 'worker-1',
    })
  })

  it('leaves non-template and non-string values unchanged', async () => {
    const parsed = await parseDataFromEventWithTrigger(
      {
        unchanged: 'static',
        count: 3,
        nested: '{{ event.data.nested }}',
      },
      baseEvent,
    )

    expect(parsed).toEqual({
      unchanged: 'static',
      count: 3,
      nested: { value: 'nested' },
    })
  })

  it('returns null when template path is missing', async () => {
    const parsed = await parseDataFromEventWithTrigger(
      {
        missing: '{{ event.data.doesNotExist }}',
      },
      baseEvent,
    )

    expect(parsed).toEqual({
      missing: null,
    })
  })
})
